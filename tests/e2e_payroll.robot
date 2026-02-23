*** Settings ***
Library           SeleniumLibrary
Suite Setup       Open Browser    ${APP_URL}    ${BROWSER}
Suite Teardown    Close Browser

*** Variables ***
${APP_URL}        http://localhost:8501
${BROWSER}        headlesschrome

*** Test Cases ***
Verify App Is Running
    [Documentation]    Test that the Streamlit app loads correctly and shows the main title.
    Maximize Browser Window
    Wait Until Page Contains    ระบบคิดเงินเดือน    timeout=10s
    Title Should Be    ระบบคิดเงินเดือนร้านอาหาร
    
Verify Shift Information Displayed
    [Documentation]    Verify the shift rules are displayed correctly.
    Wait Until Page Contains    พนักงานประจำ: เริ่ม 14.00 น.    timeout=10s
    Wait Until Page Contains    พาร์ทไทม์: เริ่ม 16.00 น.    timeout=10s

Check Tab Configurations
    [Documentation]    Verify the tabs are present.
    Wait Until Page Contains    พนักงานประจำ    timeout=10s
    Wait Until Page Contains    พาร์ทไทม์    timeout=10s
    Wait Until Page Contains    กำหนดเอง    timeout=10s
