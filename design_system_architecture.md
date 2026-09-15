# System Architecture Design

This document details the high-level architecture, infrastructure, and data flow of the Swastik Kitty App.

## 1. High-Level Architecture Diagram
*   **Client Layer:** 
    *   Flutter Mobile App (iOS/Android) for Customers.
    *   React.js Web App for Admins (Swastik CRM).
*   **API Gateway / Server Layer:**
    *   Node.js + Express server.
    *   Hosted on a VPS (e.g., Hostinger) using PM2 for cluster mode (utilizing multiple CPU cores).
    *   NGINX reverse proxy for SSL termination and load balancing.
*   **Database Layer:**
    *   MongoDB Atlas (or self-hosted Replica Set).
    *   *Why Replica Sets?* Required for MongoDB multi-document ACID transactions, crucial for the payment webhook processing.
*   **Third-Party Services:**
    *   **GoKwik:** Payment Gateway for processing UPI/Cards.
    *   **Cloudinary:** Image/PDF storage (KYC docs and Receipts).
    *   **Twilio / MSG91:** WhatsApp Business API for automated notifications.

## 2. Critical Data Flows

### A. The "Late Joiner" (Dynamic EMI) Flow
1.  User signs up in Month 3 of an ongoing 12-month, ₹60,000 scheme.
2.  User hits `/api/memberships/join`.
3.  Node.js calculates: `60000 / (12 - 3 + 1) = 6000`.
4.  Database saves `customMonthlyEmi: 6000` for this specific user.
5.  Dashboard UI reflects ₹6,000 as the next due amount.

### B. The Payment & Webhook Flow (Highly Fault-Tolerant)
1.  User clicks "Pay" in Flutter.
2.  Flutter calls `/initiate`. Node.js gets `order_id` from GoKwik and creates a `PENDING` payment in DB.
3.  User completes payment via GoKwik UI.
4.  GoKwik servers POST to `/api/payments/webhook`.
5.  **Node.js Webhook Handler:**
    *   *Security:* Verifies crypto signature.
    *   *Database:* Opens a Transaction. Updates Payment to `SUCCESS`. Adds amount to Membership `totalPaidAmount`. Commits Transaction.
    *   *Storage:* Uses `pdfkit` to draw a PDF. Uploads PDF stream to Cloudinary.
    *   *Communication:* Pings WhatsApp API with the Cloudinary URL.
6.  Flutter app polls or user refreshes dashboard to see updated progress bar.
