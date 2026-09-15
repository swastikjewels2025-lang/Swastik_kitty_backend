# Master Integration & Execution Plan

This document explains how the DB, Backend, System Architecture, and UI all connect together, and the exact order in which they must be built to ensure a smooth development lifecycle.

## The Dependency Chain (How it connects)
*   The **UI** cannot function without the **Backend APIs**.
*   The **Backend APIs** cannot be written without the **Database Schema** being defined first.
*   The **System Architecture** dictates *how* the Backend talks to the Database (e.g., using Replica Sets for transactions) and Third Parties (GoKwik, Cloudinary).

## The Step-by-Step Build Order & Testing Strategy

### Phase 1: Data & Core Services (Backend + DB + System)
*You must build this first, as it is the foundation.*
* **Reference Documents:** Look into `design_db_schema.md` and `design_backend_plan.md` for this phase.
1.  **System/Infra Setup:** Initialize the Node.js project. Connect to MongoDB. Set up Cloudinary credentials.
2.  **Database Definition:** Write the Mongoose Models based precisely on schemas.
3.  **Auth APIs:** Build the OTP login flow so users can be created in the DB.
4.  **KYC APIs:** Build the upload route hooking into Cloudinary.

**Phase 1 Testing Strategy (How to Test):**
*   **Method:** Use Postman or Thunder Client (VS Code extension).
*   **Test Case 1 (DB Connection):** Ensure the server logs "MongoDB Connected" without errors upon startup.
*   **Test Case 2 (Auth Flow):** Send a POST request to `/api/auth/send-otp` with a dummy phone number. Then hit `/api/auth/verify-otp` with the OTP and verify you receive a JWT token in the response.
*   **Test Case 3 (KYC Upload):** Attach a dummy image in Postman (form-data), hit `/api/users/kyc` with the JWT token in headers. Check your Cloudinary dashboard to ensure the image actually uploaded.

### Phase 2: Business Logic (Backend + System)
*This is the mathematical core of the application.*
* **Reference Documents:** Look into `design_backend_plan.md` and `design_system_architecture.md` for this phase.
1.  **Scheme APIs:** Build the endpoints to create and list schemes.
2.  **Dynamic EMI Logic:** Implement the `/join` API which calculates the late-joiner math.
3.  **Payment Integration:** Hook up the GoKwik SDK for order creation.
4.  **The Webhook:** Build the ACID transaction logic.
5.  **Receipts & WhatsApp:** Hook up `pdfkit` and the WhatsApp API at the end of the webhook flow.

**Phase 2 Testing Strategy (How to Test):**
*   **Method:** Postman (for APIs) and Ngrok (to expose your localhost to the internet for webhook testing).
*   **Test Case 1 (Dynamic EMI Math):** Create a 12-month scheme starting in Jan. In Postman, simulate joining in March. Verify the returned `customMonthlyEmi` is mathematically correct.
*   **Test Case 2 (The Webhook & DB Rollback - CRITICAL):** 
    *   Simulate a GoKwik success payload via Postman to your `/api/payments/webhook` URL. 
    *   Check MongoDB: Did the `Payment` document change to SUCCESS? Did `totalPaidAmount` increase?
    *   *Failure Test:* Intentionally break the code (e.g. throw a syntax error right before the transaction commits). Verify that the database rolls back and the user's `totalPaidAmount` does NOT increase.

### Phase 3: Customer Interface (UI)
*Now that the backend is fully functional, build the visual layer.*
* **Reference Document:** Look into `design_ui_plan.md` (Flutter App section) for this phase.
1.  **Flutter Setup:** Initialize the app, configure Riverpod and the Dark Green/Gold theme.
2.  **Auth UI:** Build login/OTP screens and connect them to Phase 1 APIs.
3.  **Dashboard UI:** Build the core user screen, fetching data from the Phase 2 APIs.
4.  **GoKwik UI:** Integrate the GoKwik Flutter package to trigger the payment flow.

**Phase 3 Testing Strategy (How to Test):**
*   **Method:** Flutter Emulator or a Physical mobile device.
*   **Test Case 1 (End-to-end Login):** Type a phone number into the UI, receive the OTP, enter it, and ensure the app successfully navigates to the Dashboard.
*   **Test Case 2 (Payment Flow):** Tap "Pay Next EMI". Ensure the GoKwik SDK opens. Complete a test payment using GoKwik's test cards. Ensure the UI automatically updates the Progress Bar without crashing after returning from the payment gateway.

### Phase 4: Admin Interface (UI)
*Finally, give the shop owner control.*
* **Reference Document:** Look into `design_ui_plan.md` (React Admin section) for this phase.
1.  **React Setup:** Go into the existing Swastik CRM and create the Kitty App admin routes.
2.  **Scheme Management UI:** Connect to the Phase 2 Scheme APIs.
3.  **Cash Recording UI:** Connect to the Admin Cash API.
4.  **Draw UI:** Connect to the Admin Winner API.

**Phase 4 Testing Strategy (How to Test):**
*   **Method:** Standard browser testing (Chrome/Edge).
*   **Test Case 1 (Cash Recording):** As an admin, select a user and manually record a cash payment. Verify that your phone (if using your own test number) receives the WhatsApp PDF receipt instantly, proving the webhook logic was re-used successfully.
*   **Test Case 2 (The Draw):** Select a winning token. Verify the user's status updates to `WINNER` in the DB and a broadcast message is triggered.
