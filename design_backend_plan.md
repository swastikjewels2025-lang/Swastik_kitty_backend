# Backend API Design Plan

This document details the RESTful APIs required for the Swastik Kitty App, structured by modules. Built on Node.js and Express.

## 1. Authentication Module (`/api/auth`)
*   **`POST /send-otp`**: Accepts `{ "phone": "+919876543210" }`. Generates a 6-digit OTP, stores it in memory/Redis with a 5-min expiry, and triggers the SMS provider (Twilio/MSG91).
*   **`POST /verify-otp`**: Accepts phone and OTP. If valid, looks up the User. If the user doesn't exist, creates a new `User` document. Returns a signed JWT.

## 2. User & KYC Module (`/api/users`)
*   **`POST /kyc`** *(JWT Required)*: Uses `multer` and `multer-storage-cloudinary` to accept an image file upload. Updates the user's `kyc` object in the DB with the Cloudinary URL.

## 3. Schemes Module (`/api/schemes`)
*   **`GET /active`**: Returns all schemes with `status: 'OPEN'`.
*   **`POST /`** *(Admin JWT Required)*: Accepts name, targetAmount, durationMonths. Creates a new scheme.

## 4. Memberships Module (`/api/memberships`)
*   **`POST /join`** *(JWT Required)*: 
    *   Accepts `schemeId`.
    *   **Logic:** Calculates `joinedAtMonth` (e.g., if the scheme started in Jan and it's March, `joinedAtMonth = 3`).
    *   **Math:** `customMonthlyEmi = targetAmount / (durationMonths - joinedAtMonth + 1)`.
    *   Creates and returns the new `Membership`.
*   **`GET /my-dashboard`** *(JWT Required)*: Aggregates data for the UI. Returns the scheme name, `totalPaidAmount`, `targetAmount`, remaining months, and `customMonthlyEmi`.

## 5. Payments Module (`/api/payments`)
*   **`POST /initiate`** *(JWT Required)*: Accepts `membershipId`. Creates an order with GoKwik and returns the `orderId`. Creates a `Payment` document with status `PENDING`.
*   **`POST /webhook`** *(Public)*:
    *   Called by GoKwik upon successful transaction.
    *   Verifies signature using `crypto`.
    *   **Database Transaction:** Starts a Mongoose session. Changes `Payment` status to `SUCCESS`. Increments `Membership.totalPaidAmount`. Commits transaction.
    *   **Post-processing:** Triggers PDF generation (uploading to Cloudinary) and sends a WhatsApp message with the receipt link.

## 6. Admin Controls Module (`/api/admin`)
*   **`POST /payments/record-cash`** *(Admin JWT)*: Admin manually logs a cash payment. Triggers the same PDF receipt and WhatsApp flow as the webhook.
*   **`POST /draw/record-winner`** *(Admin JWT)*: Selects a winning token for a specific month. Updates the winner's membership status to `WINNER`. Broadcasts a WhatsApp notification to all users in the scheme.
