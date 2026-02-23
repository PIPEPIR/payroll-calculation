import time
import os
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

# Replace with your Streamlit app URL
APP_URL = "https://payroll-calculation-01.streamlit.app/"

def wake_up():
    print(f"Opening {APP_URL}...")
    
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=chrome_options)
    
    try:
        driver.get(APP_URL)
        
        # Wait for the page to load
        time.sleep(10)
        
        # Check if the "Yes, get this app back up!" button exists
        # This button typically appears in an iframe or directly on the page when sleeping
        try:
            # Look for common text/buttons that indicate the app is sleeping
            # Streamlit's "Wake up" button usually has text like "Yes, get this app back up!"
            wait = WebDriverWait(driver, 15)
            wake_button = wait.until(EC.element_to_be_clickable((By.XPATH, "//button[contains(text(), 'Yes, get this app back up!')]")))
            print("App is sleeping. Clicking 'Wake up' button...")
            wake_button.click()
            time.sleep(5)
            print("Button clicked. Waiting for app to load...")
        except Exception:
            print("Wake up button not found. App might be already awake or using a different layout.")
            
        print("Page title:", driver.title)
        print("Final URL:", driver.current_url)
        
        # Take a screenshot for debugging (optional in GitHub Actions)
        driver.save_screenshot("screenshot.png")
        print("Done.")
        
    finally:
        driver.quit()

if __name__ == "__main__":
    wake_up()
