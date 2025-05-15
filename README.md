# Shopify Free Gift Logic

A Node.js application that automatically adds a free gift to a Shopify cart when the subtotal exceeds $150 (₹11,000).

## Features

- Monitors cart updates
- Adds a predefined free gift product when cart value exceeds threshold
- Removes the gift if cart value drops below threshold
- Prevents gift duplication
- Sets the gift price to ₹0 when added to cart

## APIs Used

- Shopify Admin API
  - Draft Orders API to manage cart contents
  - Products API to work with the gift product

## Setup Instructions

1. Clone this repository

   ````bash
   git clone https://github.com/YOUR_USERNAME/shopify-free-gift-logic.git
   cd shopify-free-gift-logic
   ```bash

   ````

2. Install dependencies

   ```bash
   npm install
   ```

3. Create a `.env` file with your Shopify API credentials

   ```bash
   SHOPIFY_STORE=your-store.myshopify.com
   SHOPIFY_ACCESS_TOKEN=your_access_token
   GIFT_PRODUCT_ID=your_gift_product_id
   ```

4. Start the server

   ```bash
   npm start
   ```

## How It Works

1. The application creates an Express server that listens for cart update events
2. When a cart is updated:
   - The app checks if the cart value is above ₹11,000
   - If yes, it adds the free gift (if not already present)
   - If no, it removes the free gift (if present)
3. The free gift is added with a price of ₹0, making it truly free

## Testing

You can test the functionality with:

```bash
npm test
```

This will create test carts in your Shopify store to verify the free gift logic.

## Assumptions

- The free gift product must already exist in the Shopify store
- Cart operations are handled through the Draft Orders API
- The threshold value is set at ₹11,000 (approximately $150)

## Limitations

- Requires a webhook to be set up in Shopify to notify this service of cart updates
- Runs as a standalone service that needs to be hosted on a public server
