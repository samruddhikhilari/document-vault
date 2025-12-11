import streamlit as st
import pandas as pd

path = "../../Machine Learning/logistic_regression.csv";

path = st.file_uploader("upload file here")

if path :
    data = pd.read_csv(path);
    st.dataframe(data)
