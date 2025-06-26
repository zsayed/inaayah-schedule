# The daily schedule app
This repository contains the React project for the "Inaayah's daily schedule" app.
<br> It is deployed as a GitHub Pages site using this repository.

<img width="458" alt="Screenshot 2025-06-26 at 15 20 29" src="https://github.com/user-attachments/assets/eeed38e9-2cfe-4a0e-97d7-de111dba5b30" />


## Important notes
1. Set up a Firebase project and a website to run this application.
2. Add an .env file at the root of the project for Firebase configurations

```
# .env
# Firebase Configuration for Production Deployment
REACT_APP_FIREBASE_API_KEY="AIzaSyC..."
REACT_APP_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
REACT_APP_FIREBASE_PROJECT_ID="your-project-id"
REACT_APP_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
REACT_APP_FIREBASE_MESSAGING_SENDER_ID="1234567890"
REACT_APP_FIREBASE_APP_ID="1:1234567890:web:abcdef123456"
# REACT_APP_FIREBASE_MEASUREMENT_ID="G-XXXXXXXXXX" # Uncomment if you use Analytics
```
3. Before deploying the project, make sure to install the firebase using below command
```
npm install firebase 
```

# Follow the guide to deploy the project as GitHub Pages
https://github.com/gitname/react-gh-pages
