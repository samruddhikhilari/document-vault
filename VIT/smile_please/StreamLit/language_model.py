import streamlit as st

st.title(str.upper("language understanding model"))
lang = st.selectbox("Your favourite language :",["javascript","python","java","c"])

if len(lang) >= 5:
    st.snow();
    st.success("you selected perfect language")
else :
    st.balloons();
    st.warning("you selected bad language")

st.write(f"your favourite language is : {lang}")
