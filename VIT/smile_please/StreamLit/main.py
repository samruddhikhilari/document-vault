import streamlit as st
import requests as rs

left , right = st.columns(2, border = True)

url = "https://api.exchangerate-api.com/v4/latest/INR"
response = rs.get(url)

if response.status_code == 200 :
        
    amount = int(left.number_input("Enter value"))
    rate = left.selectbox("select conversion",list(response.json()["rates"].keys()) )

    if left.button("Convert Currency :"):
        result = amount * response.json()["rates"][rate]
        right.subheader("******* The converted currency *******")
        right.write(f""" {amount} converted to {result} {rate} """)
        right.write(result)

else :
    st.error("the requesting url is failed here ")