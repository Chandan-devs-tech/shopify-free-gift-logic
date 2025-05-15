import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const shopifyStore = process.env.SHOPIFY_STORE;
const accessToken = process.env.SHOPIFY_ACCESS_TOKEN;
const giftProductId = process.env.GIFT_PRODUCT_ID;

const headers = {
  "Content-Type": "application/json",
  "X-Shopify-Access-Token": accessToken,
};

async function createTestCart(items) {
  console.log("Creating test cart...");

  try {
    const response = await axios.post(
      `https://${shopifyStore}/admin/api/2023-10/draft_orders.json`,
      {
        draft_order: {
          line_items: items,
          note: "Test cart for free gift logic",
        },
      },
      { headers }
    );

    console.log("Cart created successfully!");
    return response.data.draft_order;
  } catch (error) {
    console.error(
      "Error creating cart:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function getGiftVariantId() {
  try {
    const response = await axios.get(
      `https://${shopifyStore}/admin/api/2023-10/products/${giftProductId}.json`,
      { headers }
    );

    if (
      response.data.product &&
      response.data.product.variants &&
      response.data.product.variants.length > 0
    ) {
      return response.data.product.variants[0].id;
    }
    throw new Error("Couldn't find variant ID for gift product");
  } catch (error) {
    console.error(
      "Error getting gift variant:",
      error.response?.data || error.message
    );
    throw error;
  }
}

async function runTest() {
  try {
    const giftVariantId = await getGiftVariantId();
    console.log(`Gift variant ID: ${giftVariantId}`);

    console.log("\n----- TEST 1: CART BELOW THRESHOLD -----");
    const lowValueCart = await createTestCart([
      {
        title: "Basic T-shirt",
        quantity: 1,
        price: "1000.00",
      },
    ]);

    console.log("\nLow value cart contents:");
    lowValueCart.line_items.forEach((item) => {
      console.log(`- ${item.title}: ${item.quantity} x ₹${item.price}`);
    });
    console.log(`Subtotal: ₹${lowValueCart.subtotal_price}`);

    console.log("\n----- TEST 2: CART ABOVE THRESHOLD WITH FREE GIFT -----");
    const highValueCart = await createTestCart([
      {
        title: "Basic T-shirt",
        quantity: 1,
        price: "1000.00",
      },
      {
        title: "Premium Jeans",
        quantity: 1,
        price: "4000.00",
      },
      {
        title: "Designer Watch",
        quantity: 1,
        price: "7500.00",
      },
      {
        variant_id: giftVariantId,
        quantity: 1,
        price: "0.00",
        title: "Free Gift (₹0)",
        applied_discount: {
          value_type: "fixed_amount",
          value: "850.0",
          title: "100% Off - Free Gift",
        },
      },
    ]);

    console.log("\nHigh value cart contents:");
    highValueCart.line_items.forEach((item) => {
      console.log(`- ${item.title}: ${item.quantity} x ₹${item.price}`);
    });
    console.log(`Subtotal: ₹${highValueCart.subtotal_price}`);

    console.log("\n✨ Testing completed successfully!");
    console.log(
      "Note: You can see the test draft orders in your Shopify admin panel"
    );
  } catch (error) {
    console.error("❌ Test failed:", error.response?.data || error.message);
  }
}

runTest();
