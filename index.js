// external dependencies
const express = require('express')
const app = express()
const fs=require("fs");
const path = require('path');
const bodyParser = require('body-parser');

// generating the order id
const { v4: uuidv4 } = require('uuid');
// internal constants
const port = 3007
// Middleware to parse JSON bodies
app.use(bodyParser.json());

// Middleware to parse incoming requests with JSON payloads
app.use(express.json());
// Middleware to parse incoming requests with URL-encoded payloads
app.use(express.urlencoded({ extended: true }));



// Search products route
app.get('/search', (req, res) => {
  const searchTerm = req.query.q; // Get the search term from query parameters
  //if the searchterm index is empty
  if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
  }
  try {
      // Read products from JSON file
      const productdata = fs.readFileSync('products.json', 'utf8');
      const products = JSON.parse(productdata);

      // Filter products based on search term
      const searchstring = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
        console.log(searchstring);
      // Return filtered products
      res.json(searchstring);
    } 
  catch (err) {
      console.error('Error reading products file:', err);
      res.status(500).json({ error: 'Internal server error' });
  }
});


//reading the product.json and order.json file
const productdata = JSON.parse(fs.readFileSync('products.json', 'utf8'));
const orderData =JSON.parse(fs.readFileSync('order.json','utf-8'))
// PUT endpoint to update stock based on product id
app.put('/checkout', (req, res) => {
  const checkoutid = req.query.id;
  const checkoutquantity = req.query.stock;

  if (!checkoutid || !checkoutquantity) {
    return res.status(400).json({ error: 'Missing id or stock in the request query parameters' });
  }
  
  const productIndex = productdata.findIndex((p) => p.id === parseInt(checkoutid, 10));

  if (productIndex !== -1) {
    // Update the stock of the product with the given id
    productdata[productIndex].stock -= parseInt(checkoutquantity, 10);

    // Write the updated data back to the external JSON file
    fs.writeFileSync('products.json', JSON.stringify(productdata, null, 2), 'utf8');

    let newOrder = {
      "orderid": uuidv4(), // Use a function to generate a unique ID
      "address": "", // Add the actual address details
      "O_status": "", // Set the initial status
      "order_pid": parseInt(checkoutid), 
      "quantity": parseInt(checkoutquantity),
      "cost": productdata[productIndex].price,
      "_totalcost": checkoutquantity * productdata[productIndex].price
    };
    
    // Add the new order object to the array
    orderData.push(newOrder);

    // Write the updated array back to order.json
    fs.writeFileSync('order.json', JSON.stringify(orderData, null, 2), 'utf8');

    res.json({ success: 'Stock and order updated successfully', updatedProduct: productdata[productIndex], newOrder });
  } else {
    res.status(404).json({ error: 'Product not found' });
  }
});

// post to append new object in product.json file
app.post('/product', (req, res) => {
  // Assuming you're using body-parser middleware to parse JSON data
  // Retrieve data from request body
  const newProduct = req.body;

  // Read existing data from product.json
  fs.readFile('products.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return res.status(500).json({ message: 'Internal Server Error1' });
    }

    let products = JSON.parse(data); // Parse existing JSON data
    products.push(newProduct); // Append new product object to the array

    // Write updated data back to product.json
    fs.writeFile('products.json', JSON.stringify(products, null, 2), 'utf8', (err) => {
      if (err) {
        console.error("Error writing file:", err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      // Send a response back to the client
      res.status(201).json({ message: 'Product created successfully', product: newProduct });
    });
  });
});


//This will delete the product from our file
app.delete('/product', (req, res) => {
  const productId = req.query.id; // Get the product ID from the request URL

  // Read existing data from product.json
  fs.readFile('products.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return res.status(500).json({ message: 'Internal Server Error' });
    }

    let products = JSON.parse(data); // Parse existing JSON data
    
    
    // Find the index of the product with the specified ID
    const index = products.findIndex(product => product.id === parseInt(productId));
      
    if (index === -1) {
      // Product with the specified ID not found
      return res.status(404).json({ message: 'Product not found' });
    }

    // Remove the product from the array
    products.splice(index, 1);
    

    // Write updated data back to product.json
    fs.writeFile('products.json', JSON.stringify(products, null, 2), 'utf8', (err) => {
      if (err) {
        console.error("Error writing file:", err);
        return res.status(500).json({ message: 'Internal Server Error' });
      }

      // Send a response back to the client
      res.status(200).json({ message: 'Product deleted successfully' });
    });
  });
});


/**this will give all the details related to that order detail*/
app.get('/order', (req, res) => {
  const orderId = req.params.orderId;
  // Read existing order data from order.json
  fs.readFile('order.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading order file:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    let orderData = JSON.parse(data); // Parse existing JSON data

    // Find the order with the specified order ID
    const order = orderData.find(order => order.orderId === orderId);

    if (order) {
      // If order is found, send it as response
      res.json({ success: true, order: order });
    } else {
      // If order is not found, send error response
      res.status(404).json({ error: 'Order not found' });
    }
  });
});


// This is required to add the other nesscary details that are not generated 
//in the checkout 
app.put('/order', (req, res) => {
  const orderId = req.query.orderId;
  const { address, O_status } = req.query;

  // Find the order index by its ID
  const orderIndex = orderData.findIndex(order => order.orderid === orderId);

  if (orderIndex === -1) {
    return res.status(404).json({ error: 'Order not found' });
  }

  // Update the order with new data
  if (address) {
    orderData[orderIndex].address = address;
  }
  if (O_status) {
    orderData[orderIndex].O_status = O_status;
  }

  // Write the updated array back to order.json
  fs.writeFileSync('order.json', JSON.stringify(orderData, null, 2), 'utf8');

  res.json({ success: 'Order updated successfully', updatedOrder: orderData[orderIndex] });
});


app.delete('/order', (req, res) => {
  const orderId = req.query.orderid;

  // Read existing order data from order.json
  fs.readFile('order.json', 'utf8', (err, orderData) => {
    if (err) {
      console.error("Error reading order file:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    let orders = JSON.parse(orderData); // Parse existing JSON data

    // Find the order with the specified order ID
    const orderIndex = orders.findIndex(order => order.orderid === parseInt(orderId));

    if (orderIndex === -1) {
      // If order is not found, send error response
      return res.status(404).json({ error: 'Order not found' });
    }

    const { order_pid, quantity } = orders[orderIndex];

    // Read existing product data from products.json
    fs.readFile('products.json', 'utf8', (err, productData) => {
      if (err) {
        console.error("Error reading product file:", err);
        return res.status(500).json({ error: 'Internal Server Error' });
      }

      let products = JSON.parse(productData); // Parse existing JSON data

      // Find the product with the corresponding product ID
      const productIndex = products.findIndex(product => product.id === order_pid);

      if (productIndex !== -1) {
        // Add the quantity back to the product's stock
        products[productIndex].stock += quantity;

        // Write the updated product data back to products.json
        fs.writeFile('products.json', JSON.stringify(products, null, 2), 'utf8', (err) => {
          if (err) {
            console.error("Error writing product file:", err);
            return res.status(500).json({ error: 'Internal Server Error' });
          }
        });
      }

      // Remove the order from the order data array
      orders.splice(orderIndex, 1);

      // Write the updated order data back to order.json
      fs.writeFile('order.json', JSON.stringify(orders, null, 2), 'utf8', (err) => {
        if (err) {
          console.error("Error writing order file:", err);
          return res.status(500).json({ error: 'Internal Server Error' });
        }

        res.json({ success: 'Order deleted successfully' });
      });
    });
  });
});


app.get('/status', (req, res) => {
  const orderId = req.query.orderid;

  // Read the order data from order.json
  fs.readFile('order.json', 'utf8', (err, data) => {
    if (err) {
      console.error("Error reading file:", err);
      return res.status(500).json({ error: 'Internal Server Error' });
    }

    const orders = JSON.parse(data); // Parse existing JSON data

    // Find the order with the specified order ID
    const order = orders.find(order => order.orderid == parseInt(orderId));
    console.log(order);
    if (!order) {
      // If order is not found, send error response
      return res.status(404).json({ error: 'Order not found' });
    }

    // Send the status of the order in the response
    res.json({ status: order.O_status });
  });
});


//Listening port 
app.listen(port, () => {
  console.log(`This app listening on port ${port}`)
})