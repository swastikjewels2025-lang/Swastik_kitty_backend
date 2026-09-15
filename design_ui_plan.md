# UI/UX Design Plan

This document outlines the user interfaces for both the Customer Mobile App (Flutter) and the Admin Panel (React).

## 1. Customer Mobile App (Flutter)
**Architecture:** MVVM (Model-View-ViewModel) using Riverpod for State Management.
**Theme:** Premium aesthetics. Primary color: Dark Green (`#064e3b`). Secondary color: Gold (`#facc15`).

### Key Screens:
1.  **Splash & Onboarding:** Features the Swastik CRM logo (Gold on Dark Green). Brief slide explaining how the digital kitty works.
2.  **Login/Auth Screen:** Clean input for a 10-digit phone number. Next screen accepts the 6-digit OTP.
3.  **KYC Upload Screen:** 
    *   Required before joining a scheme.
    *   Options: "Take Photo" or "Choose from Gallery".
    *   Mandatory Checkbox: "I agree to Swastik CRM storing my documents."
4.  **Home / Dashboard Screen (The Core Experience):**
    *   Top card showing active scheme name and total target amount.
    *   **Progress Ring/Bar:** Visually showing `Total Paid` vs `Target Amount`.
    *   Stats row: "Months Paid", "Months Remaining".
    *   Large, prominent Gold button: **"Pay Next EMI (₹X)"**.
5.  **Payment Processing Screen:**
    *   Invokes the GoKwik SDK/Webview.
    *   On success, shows an animated green checkmark and auto-routes back to Dashboard.
6.  **History & Receipts Screen:**
    *   A list view of all past payments (both Online and Cash).
    *   Each row has a "View PDF Receipt" button which opens the Cloudinary link in an in-app browser.

## 2. Admin Panel (React.js)
This will be a new module integrated directly into the existing Swastik CRM React application.

### Key Screens:
1.  **Scheme Management Table:**
    *   Lists all schemes, their capacity (e.g., 45/100 members), and status.
    *   Button to "Create New Scheme".
2.  **Member Ledger View:**
    *   Clicking a scheme opens a table of all members.
    *   Shows who has paid for the current month and who is defaulted.
3.  **Cash Collection Modal:**
    *   A quick-action modal for walk-in customers.
    *   Admin selects user, confirms amount, and clicks "Record Cash". (This auto-sends the WhatsApp receipt to the customer standing in the shop).
4.  **Monthly Draw Interface:**
    *   An interface used once a month during the physical draw.
    *   Admin selects the scheme, selects the month (e.g., "Month 4 Draw").
    *   Input field to enter the winning token number.
    *   Button: "Declare Winner & Notify All".
