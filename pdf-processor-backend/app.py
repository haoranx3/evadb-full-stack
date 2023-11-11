from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
from flask_cors import CORS  # Import CORS from flask_cors
from PyPDF2 import PdfReader
import evadb
import os
import pandas as pd
import re

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:3000"}})

openai_key = ""
os.environ['OPENAI_KEY'] = openai_key



@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    uploaded_file = request.files['pdfFile']

    if not uploaded_file:
        return 'No file uploaded.', 400

    # Ensure the filename is safe for storage
    filename = secure_filename(uploaded_file.filename)

    try:
        # Open the PDF file and extract text
        with open(filename, 'wb') as local_file:
            uploaded_file.save(local_file)

        pdf_text = extract_text(filename)
        pickup_zipcode = get_pickup_zipcode(pdf_text)
        deliveryZipcode = get_delivery_zipcode(pdf_text)
        to_chatGpt(pdf_text)

        return jsonify({'message': f'PDF file "{filename}" uploaded and text extracted successfully.', 
        'text': f'{pdf_text}', 'pickup_zipcode': f'{pickup_zipcode}', 'delivery_zipcode': f'{deliveryZipcode}'})
    except Exception as e:
        print(e)
        return str(e), 500


def extract_text(pdf_file):
    try:
        pdf_reader = PdfReader(pdf_file)
        pdf_text = ""
        pdf_text += pdf_reader.pages[0].extract_text()
        return pdf_text
    except Exception as e:
        print("Error extracting text:", str(e))
        return None

@app.route('/api/answer', methods=['POST'])
def answer_question():
    request_data = request.get_json()
    question = request_data.get('question')
    cursor = evadb.connect().cursor()
    generate_answer = cursor.table("Summary").select(
            f"""ChatGPT('{question}', summary)"""
    )
    answer = generate_answer.df()["response"][0]
    return jsonify({'answer': answer})

def get_pickup_zipcode(pdf_text):
    pickupIndex = pdf_text.find("Pickup location")
    firmsCodeIndex = pdf_text.find("FIRMS Code")
    print(pdf_text[pickupIndex : firmsCodeIndex])
    address = pdf_text[pickupIndex : firmsCodeIndex]
    usIndex = address.find("United States")
    return address[usIndex - 6: usIndex - 1]

def get_delivery_zipcode(pdf_text):
    deliveryIndex = pdf_text.find("Delivery location")
    address = pdf_text[deliveryIndex : ]
    usIndex = address.find("United States")
    return address[usIndex - 6: usIndex - 1]



@app.route('/api/history_rates', methods=['POST'])
def get_history_rates():
    request_data = request.get_json()
    pickup_zipcode = request_data.get('pickupZipcode')
    delivery_zipcode = request_data.get('deliveryZipcode')
    cursor = evadb.connect().cursor()
    cursor.drop_table("FTL_History_RatesV3", if_exists=True).execute()
    cursor.query(
                """CREATE TABLE IF NOT EXISTS FTL_History_RatesV3 (pickupzipcode TEXT(10), deliveryzipcode TEXT(10), date TEXT(20), price INTEGER);"""
    ).execute()
    cursor.query("""LOAD CSV 'history_rates.csv' INTO FTL_History_RatesV3""").execute()
    rates_df = cursor.query(f"""SELECT date, price FROM FTL_History_RatesV3 WHERE pickupzipcode = '{pickup_zipcode}' AND deliveryzipcode = '{delivery_zipcode}';""").df()
    return jsonify(rates_df.to_json(orient='records'))

@app.route('/api/future_rates', methods=['POST'])
def get_price_prediction():
    request_data = request.get_json()
    pickup_zipcode = request_data.get('pickupZipcode')
    delivery_zipcode = request_data.get('deliveryZipcode')
    cursor = evadb.connect().cursor()
    cursor.query(f"""
        CREATE OR REPLACE FUNCTION FTLRatesForecastV3 FROM
            (
            SELECT *
            FROM FTL_History_RatesV3 WHERE pickupzipcode = '{pickup_zipcode}' AND deliveryzipcode = '{delivery_zipcode}'
            )
        TYPE Forecasting
        PREDICT 'price'
        HORIZON 10
        TIME 'date'
        FREQUENCY 'D'
    """).df()
    future_prices_df = cursor.query("""SELECT FTLRatesForecastV3();""").df()
    return jsonify(future_prices_df.to_json(orient='records'))
    


def to_chatGpt(summary):
    df = pd.DataFrame([{"summary": summary}])
    df.to_csv("summary.csv")
    cursor = evadb.connect().cursor()
    cursor.drop_table("Summary", if_exists=True).execute()
    cursor.query(
            """CREATE TABLE IF NOT EXISTS Summary (summary TEXT(5000));"""
    ).execute()
    cursor.query("""LOAD CSV 'summary.csv' INTO Summary""").execute()

if __name__ == '__main__':
    app.run(debug=True)
