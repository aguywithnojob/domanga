#!/usr/bin/env python3
"""
Pulls expense rows from a Google Sheet and saves them to Firestore.
Clears sheet data rows on successful write (header is preserved).
  date | transaction_type | amount | to_who
"""

import os
import json
import sys
from datetime import datetime, timezone

import gspread
from google.oauth2.service_account import Credentials
import firebase_admin
from firebase_admin import credentials as fb_credentials, firestore

KEYWORD_RULES = [
    # Food & Dining
    ('zomato',           'food'),
    ('swiggy',           'food'),
    ('eatsure',          'food'),
    ('dominos',          'food'),
    ('mcdonald',         'food'),
    ('bistro',           'food'),
    ('starbucks',        'food'),
    ('cafe coffee',      'food'),
    ('pluxee',           'food'),
    ('sodexo',           'food'),
    ('meal card',        'food'),
    ('KANHABHOG',        'food'),
    ('FOOD',        'food'),
    ('TOPBOX VENTU',        'food'),
    # Grocery
    ('bigbasket',        'grocery'),
    ('big basket',       'grocery'),
    ('zepto',            'grocery'),
    ('blinkit',          'grocery'),
    ('instamart',        'grocery'),
    ('supermarket',      'grocery'),
    ('reliance smart',   'grocery'),
    ('reliance sm',      'grocery'),
    ('reliance fresh',   'grocery'),
    ('smart bazaar',     'grocery'),
    ('dmart',            'grocery'),
    ('star bazaar',      'grocery'),
    ('spencer',          'grocery'),
    ('nature basket',    'grocery'),
    ('Amazon Pay Groc', 'grocery'),
    # Transport
    ('ola',              'transport'),
    ('uber',             'transport'),
    ('rapido',           'transport'),
    ('yulu',             'transport'),
    ('metro',            'transport'),
    ('irctc',            'travel'),
    ('indigo',           'travel'),
    ('air india',        'travel'),
    ('bus',              'transport'),
    # Shopping
    ('amazon',           'shopping'),
    ('flipkart',         'shopping'),
    ('myntra',           'shopping'),
    ('ajio',             'shopping'),
    ('nykaa',            'shopping'),
    ('meesho',           'shopping'),
    # Entertainment
    ('netflix',          'entertainment'),
    ('jio hotstar',          'entertainment'),
    ('disney',           'entertainment'),
    ('spotify',          'entertainment'),
    ('youtube',          'entertainment'),
    ('zee5',          'entertainment'),
    ('bookmyshow',       'entertainment'),
    ('pvr',              'entertainment'),
    ('inox',             'entertainment'),
    # Healthcare
    ('apollo',           'healthcare'),
    ('medplus',          'healthcare'),
    ('practo',           'healthcare'),
    ('1mg',              'healthcare'),
    ('pharmeasy',        'healthcare'),
    ('netmeds',          'healthcare'),
    ('medical',          'healthcare'),
    # Utilities
    ('bescom',           'utilities'),
    ('bwssb',            'utilities'),
    ('tata power',       'utilities'),
    ('adani',            'utilities'),
    ('airtel',           'utilities'),
    ('jio',              'utilities'),
    ('jio fiber',              'utilities'),
    ('vi',               'utilities'),
    ('bsnl',             'utilities'),
    ('electricity',      'utilities'),
    ('Uttar Pradesh P',      'utilities'),
    ('water bill',       'utilities'),
    ('gym',       'gym'),
    ('fitness',       'gym'),
    ('health club',       'gym'),
    ('swimming',       'gym'),
]

DATE_FORMATS = [
    '%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d',
    '%d/%m/%y', '%d-%m-%y',
    '%d %b %Y', '%d %b %y',
    '%d-%b-%Y', '%d-%b-%y',
]

def map_category(text: str) -> str:
    lower = text.lower().strip()
    for keyword, category_id in KEYWORD_RULES:
        if keyword in lower:
            return category_id
    return 'others'

def parse_date(date_str: str) -> datetime:
    for fmt in DATE_FORMATS:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    print(f'  ⚠ Could not parse date "{date_str}", using today.')
    return datetime.now(timezone.utc)

def normalise_headers(records):
    """Lower-case and strip all keys so column naming is forgiving."""
    return [{k.lower().strip(): v for k, v in row.items()} for row in records]

def main():
    # ── Read env vars ──────────────────────────────────────────────────────────
    sa_json    = os.environ.get('FIREBASE_SERVICE_ACCOUNT', '')
    sheet_id   = os.environ.get('GOOGLE_SHEET_ID', '')
    gautam_uid = os.environ.get('GAUTAM_UID', '')
    couple_id  = os.environ.get('COUPLE_ID', '')

    for name, val in [('FIREBASE_SERVICE_ACCOUNT', sa_json), ('GOOGLE_SHEET_ID', sheet_id),
                      ('GAUTAM_UID', gautam_uid), ('COUPLE_ID', couple_id)]:
        if not val:
            print(f'Error: {name} env var is not set.')
            sys.exit(1)

    try:
        sa_info = json.loads(sa_json)
    except json.JSONDecodeError:
        print('Error: FIREBASE_SERVICE_ACCOUNT is not valid JSON.')
        sys.exit(1)

    # ── Google Sheets ──────────────────────────────────────────────────────────
    print('Connecting to Google Sheets…')
    scopes = ['https://www.googleapis.com/auth/spreadsheets']
    creds  = Credentials.from_service_account_info(sa_info, scopes=scopes)
    gc     = gspread.authorize(creds)

    try:
        spreadsheet = gc.open_by_key(sheet_id)
    except gspread.exceptions.SpreadsheetNotFound:
        print(f'Error: Sheet "{sheet_id}" not found. '
              'Share it with the service account email.')
        sys.exit(1)

    sheet = spreadsheet.sheet1
    all_values = sheet.get_all_values()

    if not all_values:
        print('Sheet is empty — nothing to process.')
        return

    # No header row — columns are positional: date, transaction_type, amount, to_who
    records = [
        {'date': row[0], 'transaction_type': row[1], 'amount': row[2], 'to_who': row[3]}
        for row in all_values
        if len(row) >= 4
    ]
    print(f'Found {len(records)} data rows.')
    if not len(records):
        sheet.clear()
        return

    # ── Firebase ───────────────────────────────────────────────────────────────
    print('Connecting to Firestore…')
    app = firebase_admin.initialize_app(fb_credentials.Certificate(sa_info))
    db  = firestore.client()

    # ── Build Firestore batch ──────────────────────────────────────────────────
    batch   = db.batch()
    written = 0
    skipped = 0

    for i, row in enumerate(records, start=2):  # row 2 = first data row
        date_str = str(row.get('date', '')).strip()
        txn_type = str(row.get('transaction_type', '')).strip()
        amount_raw = str(row.get('amount', '')).strip().replace(',', '')
        to_who   = str(row.get('to_who', '')).strip()

        # Skip empty / invalid rows
        if not date_str and not amount_raw and not to_who:
            skipped += 1
            continue
        elif amount_raw == '' or amount_raw == '0' or amount_raw == '0.00' or amount_raw.lower() == 'inr' or amount_raw == '₹0':
            skipped += 1
            continue
        try:
            amount = float(amount_raw)
        except ValueError:
            print(f'  ⚠ Row {i}: invalid amount "{amount_raw}" — skipped.')
            skipped += 1
            continue
        if amount <= 0:
            skipped += 1
            continue

        date        = parse_date(date_str)
        category_id = map_category(f"{to_who}")
        description = to_who or 'Transaction'

        doc_ref = db.collection('expenses').document()
        batch.set(doc_ref, {
            'coupleId':    couple_id,
            'paidBy':      gautam_uid,
            'amount':      amount,
            'category':    category_id,
            'description': description,
            'date':        date,
            'createdAt':   datetime.now(timezone.utc),
            'source':      'sheets',
        })
        written += 1
        print(f'  ✓ Row {i}: ₹{amount} · {category_id} · {description}')

    if written == 0 and skipped == 0:
        print('No valid rows to write — sheet not cleared.')
        return

    # ── Commit batch ───────────────────────────────────────────────────────────
    if written > 0:
        print(f'\nCommitting {written} expenses to Firestore…')
        batch.commit()
    print(f'✅ Saved {written} expenses. ({skipped} rows skipped)')

    # ── Clear sheet (no header row to preserve) ───────────────────────────────
    print('Clearing sheet rows…')
    sheet.clear()
    print(f'Sheet cleared')

    firebase_admin.delete_app(app)

if __name__ == '__main__':
    main()
