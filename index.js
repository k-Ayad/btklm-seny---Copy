const express = require('express');
const cors = require('cors')
const morgan = require('morgan');
const app = express();
var cron = require('node-cron');
require('dotenv').config();
const port = process.env.PORT;
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
app.use(morgan("dev"));
app.use(cors());
 
/////////////////////////////// Firebase Initialization ///////////////////////////////////////////////////////////
const serviceAccount = require('./serviceAccountKey.json');
 
initializeApp({
  credential: cert(serviceAccount)
});
 
const db = getFirestore();
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
// cron.schedule('*/2 * * * * *', async () => {
// });
app.get('/sync', async (req,res,next)=>{

  try{
    await main();
    res.status(200).json({message:'success'});
  }catch(e){
    res.status(500).json({message:'error'})
  }

});
 
/////////////////////////////// Getting Orders from Shopify API ////////////////////////////////////////////////
const getAllOrders = () => {
  return new Promise(async (resolve,reject)=> {
    try{
      const allOrders = await fetch(`${process.env.SHOPIFY_URL}/admin/api/2024-07/orders.json`,{
        method: 'GET',
        headers: {'X-Shopify-Access-Token':process.env.SHOPIFY_TOKEN, 'Content-Type':'application/json'}
      });
      resolve(await allOrders.json());
    }catch(e){
      reject(e);
    }
  })
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
/////////////////////////////// Closing orders on Shopify ///////////////////////////////////////////////////////
const closeOrder = (orderID) => {
  return new Promise(async (resolve,reject)=> {
    try{
       await fetch(`${process.env.SHOPIFY_URL}/admin/api/2023-01/orders/${orderID}/close.json`,{
        method: 'POST',
        headers: {'X-Shopify-Access-Token':process.env.SHOPIFY_TOKEN, 'Content-Type':'application/json'}
      });
      resolve('Order is closed');
    }catch(e){
      reject(e);
    }
  })
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
/////////////////////////////// Getting required data only from All Products ////////////////////////////////////
const getRequiredData = async () => {
  const orders = await getAllOrders();
  // getting required parameters only in the array
  const requiredData = orders.orders.map(el => {
    // getting contact_email and created_at and line_items [id, quantity]
    return {id:el['id'],order_number:el['order_number'],email:el['contact_email'],created_at:el['created_at'],line_items:el['line_items'].map(el=> { return {id:el['product_id'],quantity:el['quantity']} })};
  })
  // removing items with no email and with no line_items
  .filter(el => el.email && el.line_items.length > 0 && el);
  // returning the new array with the required parameters
  return requiredData;
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
/////////////////////////////// Database operations ////////////////////////////////////
const createNewUser = async ({id,order_number,email,created_at,line_items}) => {
  try {    
    const docRef = db.collection('Subscription').doc(email);
    await docRef.set({
      order_number,
      email,
      created_at,
      line_items,
    });
    await closeOrder(id);
  }catch(e){
    console.log(e);
  }
}
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////
 
const main = async ()=>{
  const orders = await getRequiredData();
  if(orders?.length > 0){
    for(let i = 0; i < orders.length; i++){
     await createNewUser(orders[i]);
    }
  }
};
 
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
 