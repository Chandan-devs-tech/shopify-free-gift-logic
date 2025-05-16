import dotenv from "dotenv";
import express from "express";
import axios from "axios";

dotenv.config();

const app = express();
app.use(express.json());

const shopifyStore = process.env.SHOPIFY_STORE;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const giftProductId = process.env.GIFT_PRODUCT_ID;

const shopifyHeaders = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": accessToken,
};

const MINIMUM_CART_VALUE = 11000;

function isFreeGift(item) {
  if (item.title === "Free Gift") return true;
  if (item.product_id && item.product_id.toString() === giftProductId)
    return true;
  return false;
}

app.post("/check-cart", async (req, res) => {
  try {
    const { cart_id, cart_token, cart_value } = req.body;

    if (!cart_token && !cart_id) {
      return res.status(400).json({ error: "Cart identifier is required" });
    }

    console.log(`Processing cart with value: ₹${cart_value}`);

    let cartId = cart_id;
    if (!cartId && cart_token) {
      const draftOrdersResponse = await axios.get(
        `https://${shopifyStore}/admin/api/2023-10/draft_orders.json`,
        { headers: shopifyHeaders }
      );

      const matchingOrder = draftOrdersResponse.data.draft_orders.find(
        (order) => order.cart_token === cart_token
      );

      if (!matchingOrder) {
        return res.status(404).json({ error: "Cart not found" });
      }

      cartId = matchingOrder.id;
    }

    const cartResponse = await axios.get(
      `https://${shopifyStore}/admin/api/2023-10/draft_orders/${cartId}.json`,
      { headers: shopifyHeaders }
    );

    const cart = cartResponse.data.draft_order;

    const freeGiftItem = cart.line_items.find((item) => isFreeGift(item));

    if (cart_value >= MINIMUM_CART_VALUE) {
      if (!freeGiftItem) {
        const productsResponse = await axios.get(
          `https://${shopifyStore}/admin/api/2023-10/products.json`,
          { headers: shopifyHeaders }
        );

        const products = productsResponse.data.products;
        const freeGiftProduct = products.find(
          (p) => p.id.toString() === giftProductId
        );

        if (
          !freeGiftProduct ||
          !freeGiftProduct.variants ||
          freeGiftProduct.variants.length === 0
        ) {
          return res.status(404).json({ error: "Free gift product not found" });
        }

        const variantId = freeGiftProduct.variants[0].id;

        await axios.put(
          `https://${shopifyStore}/admin/api/2023-10/draft_orders/${cartId}.json`,
          {
            draft_order: {
              line_items: [
                ...cart.line_items,
                {
                  variant_id: variantId,
                  quantity: 1,
                  price: "0.00",
                  title: "Free Gift",
                },
              ],
            },
          },
          { headers: shopifyHeaders }
        );

        console.log("Free gift added to cart");
      }
    } else {
      if (freeGiftItem) {
        const updatedLineItems = cart.line_items.filter(
          (item) => !isFreeGift(item)
        );

        await axios.put(
          `https://${shopifyStore}/admin/api/2023-10/draft_orders/${cartId}.json`,
          {
            draft_order: {
              line_items: updatedLineItems,
            },
          },
          { headers: shopifyHeaders }
        );

        console.log("Free gift removed from cart");
      }
    }

    res
      .status(200)
      .json({ success: true, message: "Cart processed successfully" });
  } catch (error) {
    console.error("Error processing cart:", error);
    res.status(500).json({ error: "Error processing cart" });
  }
});

app.get("/status", (req, res) => {
  res.status(200).json({
    status: "running",
    message: "Free Gift Logic service is active",
    threshold: `₹${MINIMUM_CART_VALUE}`,
  });
});

app.get("/setup-webhook", async (req, res) => {
  try {
    const response = await axios.post(
      `https://${shopifyStore}/admin/api/2024-10/webhooks.json`,
      {
        webhook: {
          topic: "carts/update",
          address:
            "https://shopify-free-gift-logic.onrender.com/webhook-handler",
          format: "json",
        },
      },
      { headers: shopifyHeaders }
    );

    console.log("Webhook registered successfully:", response.data);
    res
      .status(200)
      .json({ success: true, message: "Webhook registered successfully" });
  } catch (error) {
    console.error(
      "Error registering webhook:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "Error setting up webhook" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Free Gift Logic app is monitoring carts with threshold: ₹${MINIMUM_CART_VALUE}`
  );
});

app.post("/webhook-handler", async (req, res) => {
  try {
    // Get cart data from webhook
    const cartData = req.body;

    // Check if this is actually a cart update webhook
    console.log("Received webhook:", cartData);

    // Get the cart ID and token (if available)
    const cartId = cartData.id;
    const cartToken = cartData.token;
    const cartValue = parseFloat(cartData.total_price || "0");

    // Process the cart using your existing logic
    // This will leverage your existing check-cart code logic
    await processCart(cartId, cartToken, cartValue);

    // Return 200 OK to acknowledge receipt
    res.status(200).end();
  } catch (error) {
    console.error("Error processing webhook:", error);
    // Still return 200 so Shopify doesn't retry
    res.status(200).end();
  }
});

// Helper function to reuse your existing cart processing logic
async function processCart(cartId, cartToken, cartValue) {
  try {
    // This reuses your existing logic, but now as a function
    const cartResponse = await axios.get(
      `https://${shopifyStore}/admin/api/2023-10/draft_orders/${cartId}.json`,
      { headers: shopifyHeaders }
    );

    const cart = cartResponse.data.draft_order;
    const freeGiftItem = cart.line_items.find((item) => isFreeGift(item));

    if (cartValue >= MINIMUM_CART_VALUE) {
      if (!freeGiftItem) {
        // Add free gift logic (your existing code)
        const productsResponse = await axios.get(
          `https://${shopifyStore}/admin/api/2023-10/products.json`,
          { headers: shopifyHeaders }
        );

        const products = productsResponse.data.products;
        const freeGiftProduct = products.find(
          (p) => p.id.toString() === giftProductId
        );

        if (
          !freeGiftProduct ||
          !freeGiftProduct.variants ||
          freeGiftProduct.variants.length === 0
        ) {
          throw new Error("Free gift product not found");
        }

        const variantId = freeGiftProduct.variants[0].id;

        await axios.put(
          `https://${shopifyStore}/admin/api/2023-10/draft_orders/${cartId}.json`,
          {
            draft_order: {
              line_items: [
                ...cart.line_items,
                {
                  variant_id: variantId,
                  quantity: 1,
                  price: "0.00",
                  title: "Free Gift",
                },
              ],
            },
          },
          { headers: shopifyHeaders }
        );

        console.log("Free gift added to cart");
      }
    } else {
      if (freeGiftItem) {
        // Remove free gift logic (your existing code)
        const updatedLineItems = cart.line_items.filter(
          (item) => !isFreeGift(item)
        );

        await axios.put(
          `https://${shopifyStore}/admin/api/2023-10/draft_orders/${cartId}.json`,
          {
            draft_order: {
              line_items: updatedLineItems,
            },
          },
          { headers: shopifyHeaders }
        );

        console.log("Free gift removed from cart");
      }
    }

    return true;
  } catch (error) {
    console.error("Error in processCart:", error);
    return false;
  }
}
