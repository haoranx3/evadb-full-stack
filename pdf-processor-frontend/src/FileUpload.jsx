import React, { useState } from 'react';
import LineChart from './LineChart';

function FileUpload() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [responseText, setResponseText] = useState('');
  const [isTextVisible, setIsTextVisible] = useState(false);
  const [isAnswerVisible, setIsAnswerVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('')
  const [chatGPTLoading, setChatGPTLoading] = useState(false)
  const [pickupZipcode, setPickupZipcode] = useState('')
  const [deliveryZipcode, setDeliveryZipcode] = useState('')
  const [rates, setRates] = useState([])
  const [futureRates, setFutureRates] = useState([])

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
  };

  const handleQuestionChange = (e) => {
    setQuestion(e.target.value);
  };

  async function uploadFile() {
    if (selectedFile) {
      const formData = new FormData();
      formData.append('pdfFile', selectedFile);
      setIsLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/upload', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        setResponseText(data.text);
        setPickupZipcode(data.pickup_zipcode)
        setDeliveryZipcode(data.delivery_zipcode)
        // Handle the response (e.g., display success message)
      } catch (error) {
        // Handle errors
      } finally {
        setIsLoading(false)
      }
    }
  }

  async function answerQuestion(question) {
    setChatGPTLoading(true)
    setAnswer('')
    setIsAnswerVisible(false)
    try {
      const response = await fetch('http://localhost:5000/api/answer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ question }),
      });
      const data = await response.json();
      setAnswer(data.answer);
      // Handle the response (e.g., display success message)
    } catch (error) {
      // Handle errors
    } finally {
      setChatGPTLoading(false)
    }
  }

  async function getRatesPrediction() {
    try {
      const response = await fetch('http://localhost:5000/api/future_rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pickupZipcode: pickupZipcode, deliveryZipcode: deliveryZipcode }),
      });
      const data = await response.json();
      setFutureRates(data)
      // Handle the response (e.g., display success message)
    } catch (error) {
      // Handle errors
    }
  }

  async function getHistoryRates() {
    try {
      const response = await fetch('http://localhost:5000/api/history_rates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pickupZipcode: pickupZipcode, deliveryZipcode: deliveryZipcode }),
      });
      const data = await response.json();
      setRates(data)
      // Handle the response (e.g., display success message)
    } catch (error) {
      // Handle errors
    }
  }

  const toggleTextVisibility = () => {
    setIsTextVisible(!isTextVisible);
  };

  const toggleAnswerVisibility = () => {
    setIsAnswerVisible(!isAnswerVisible);
  };
  

  return (
    <div style={{ textAlign: 'center', margin: '20px' }}>
    <input type="file" accept=".pdf" onChange={handleFileUpload} style={{ margin: '10px' }} />

      <button onClick={uploadFile} style={{ margin: '10px' }} disabled={isLoading}>
        {isLoading ? 'Uploading...' : 'Upload'}
      </button>
      {pickupZipcode && deliveryZipcode && (
      <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}>
        <div style={{ marginRight: '20px' }}>
          <label>
            Pickup Zip Code:
            <input type="text" value={pickupZipcode} readOnly />
          </label>
        </div>
        <div>
          <label>
            Delivery Zip Code:
            <input type="text" value={deliveryZipcode} readOnly />
          </label>
        </div>
        <button onClick={()=> {getHistoryRates()}} style={{ margin: '10px' }} >
        Get history price
      </button>
      {rates.length > 0 && <button onClick={()=> {getRatesPrediction()}} style={{ margin: '10px' }} >
        Predict future price
      </button>}
      </div>
    )}

    {rates.length > 0 && <div>
        <label>Rates Chart</label>
        <LineChart jsonData={rates} futureData={futureRates} />
    </div>}
      <div
        style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}
        onClick={toggleTextVisibility}
      >
        <h2>Click here to {isTextVisible ? 'hide' : 'show'} Text From PDF</h2>
        {isTextVisible && (
          <pre style={{ whiteSpace: 'pre-wrap' }}>{responseText}</pre>
        )}
      </div>

      <div style={{ marginBottom: '10px' }}>
        <label>
          Enter your question: {' '}
          <input type="text" value={question} onChange={handleQuestionChange} />
        </label>
        <button onClick={() => answerQuestion(question)} style={{ margin: '10px' }} disabled={chatGPTLoading}>
        {chatGPTLoading ? 'Processing' : 'Ask ChatGPT'}
      </button>
      </div>
      <div
        style={{ marginTop: '20px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px', cursor: 'pointer' }}
        onClick={toggleAnswerVisibility}
      >
        <h2>Click here to {isAnswerVisible ? 'hide' : 'show'} ChatGPT's answer</h2>
        {isAnswerVisible && (
          <pre style={{ whiteSpace: 'pre-wrap' }}>{answer}</pre>
        )}
      </div>
    </div>
  );
}

export default FileUpload
