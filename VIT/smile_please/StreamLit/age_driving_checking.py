import streamlit as st
import datetime

dob = st.date_input(
    "select your date of birth",
    value = datetime.datetime.now(),
    min_value =  datetime.date(1990,1,1),
    max_value = datetime.date(2040,1,1)
    )
currentDate = datetime.datetime.now().year;

age = currentDate - dob.year ; 

st.write(age)

if len(str(age)) >0 :
    if age >= 18 :
        st.success("you are eligible for driving license")
        st.snow()
    else :
        st.warning("sorry you are not eligible for driving license")
        st.balloons()

#year month day