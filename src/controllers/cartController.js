const cartModel = require("../models/cartModel")
const productModel = require("../models/productModel")
const userModel = require("../models/userModel")
const mongoose = require("mongoose")
const { isValidObjectId } = require('mongoose')
const { isValid, isValidRequestBody, numsRegex } = require("../validator/validation")

//**************************************************CREATE CART*************************************************************************** */
const createCart = async function (req, res) {
  try {
    const data = req.body;
    const userId = req.params.userId;
    let { productId, cartId } = data

    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, message: "Please give a valid userId" })
    }
    if (userId !== req.userId) {
      return res.status(403).send({ status: false, message: "You are not able to create the cart" })//authorizaton
    }
    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Please give some data for create cart" })
    }
    if (cartId) {
      if (!isValid(cartId)) {
        return res.status(400).status({ status: false, message: "cardId should not be empty" })
      }
      if (!isValidObjectId(cartId)) {
        return res.status(400).send({ staus: false, message: "Please provide a valid cartId" })
      }
    }
    if (!isValid(productId)) {
      return res.status(400).send({ status: false, message: "Please provide a productId" })
    }
    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: "Please provide a valid productId" })
    }
    const product = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!product) {
      return res.status(404).send({ status: false, message: "product is not exist or already deleted" })
    }
    const cart = await cartModel.findOne({ userId: userId })
    if (!cart) {
      if (cartId) return res.status(400).send({ status: false, message: "This cart is not exist for this particular user" })//when user create cart for first time then he have not any cartId so if he enter a cartid in body then it throw the error
      let addCart = {
        userId: userId,
        items: [{ productId: productId, quantity: 1 }],
        totalPrice: product.price,
        totalItems: 1,
      }
      const create = await cartModel.create(addCart)
      return res.status(201).send({ status: true, message: "Success", data: create })
    }
    if (cart) {
      if (!cartId) {
        return res.status(400).send({ status: false, message: "please provide cartId for this particuler user" })
      }
      if (cart._id.toString() != cartId) {
        return res.status(404).send({ status: false, message: "Cart id is not correct" })
      }
    }
    let arr = cart.items;
    for (let i = 0; i < arr.length; i++) {
      if (arr[i].productId.toString() == productId) {
        arr[i].quantity = arr[i].quantity + 1
        var updateCart = await cartModel.findOneAndUpdate({ userId: userId }, { items: arr, totalPrice: cart.totalPrice + product.price, totalItems: arr.length }, { new: true })
      }
      else {
        let newCart = {
          $addToSet: { items: { productId: product._id, quantity: 1 } },
          totalPrice: product.price + cart.totalPrice,
          totalItems: cart.totalItems + 1
        }
        updateCart = await cartModel.findOneAndUpdate({ userId: userId }, newCart, { new: true }).populate([{path:"items.productId"}])
      }
    }
    return res.status(201).send({ status: true, message: "Success", data: updateCart })
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }
}

//*******************************************updatedCart***************************************************************************** */


const updatedCart = async function (req, res) {
  try {
    const userId = req.params.userId;
    const data = req.body;
    let { productId, cartId, removeProduct } = data
    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, message: "Please give a valid userId" })
    }
    if (userId !== req.userId) {
      return res.status(403).send({ status: false, message: "You are not able to create the cart" })//authorizaton
    }
    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Please give some data for create cart" })
    }
    if (cartId) {
      if (!isValid(cartId)) {
        return res.status(400).status({ status: false, message: "cardId should not be empty" })
      }
      if (!isValidObjectId(cartId)) {
        return res.status(400).send({ staus: false, message: "Please provide a valid cartId" })
      }
    }
    if (!isValid(productId)) {
      return res.status(400).send({ status: false, message: "Please provide a productId" })
    }
    if (!isValidObjectId(productId)) {
      return res.status(400).send({ status: false, message: "Please provide a valid productId" })
    }

    if (!isValid(removeProduct)) {
      return res.status(400).send({ status: false, message: "Please provide removeProduct" })
    }
    if (!numsRegex.test(removeProduct)) {
      return res.status(400).send({ status: false, message: "Remove product between 0 to 1" })
    }

    let products = await productModel.findOne({ _id: productId, isDeleted: false })
    if (!products) {
      return res.status(400).send({ status: false, message: "product is not exist or already deleted" })
    }

    let carts = await cartModel.findOne({ _id: cartId, "items.$.productId": productId })
    if (!carts) {
      return res.status(400).send({ status: false, message: "cart is not exist or product is not available this cart" })
    }


    //  if(removeProduct )

    let cartProductUse = carts.items.filter((x) => x.productId._id.toString() === productId)
    console.log(cartProductUse)
    if (removeProduct === 0) {
      if (cartProductUse.length === 0) {
        return res.status(200).send({ status: true, message: "this product is deleted from your cart... please continuous with your favourite product" })
      }
      let cartDetails = await cartModel.findOneAndUpdate({ _id: cartId, "items.productId": productId },
        {
          $pull: { items: { productId: productId } },
          $inc: {
            totalPrice: -products.price * cartProductUse[0].quantity,
            totalItems: -1
          }
        }, { new: true }).populate([{ path: "items.productId" }])
      return res.status(200).send({ status: true, message: " Cart update", data: cartDetails })
    }
    if (removeProduct === 1) {
      if (cartProductUse.length === 0) {
        return res.status(200).send({
          status: true,
          message: "this product is deleted from your cart... please continuous with your favourite product",
          data: carts
        })
      }
      if (cartProductUse[0].quantity === 1) {
        let cartDetails = await cartModel.findOneAndUpdate({ _id: cartId, "items.productId": productId },
          {
            $pull: { items: { productId: productId } },
            $inc: { totalPrice: -products.price * cartProductUse[0].quantity, totalItems: -1 }
          },
          { new: true }).populate([{ path: "items.productId" }])
        return res.status(200).send({
          status: true,
          message: "product removed from cart",
          data: cartDetails
        })
      }
      if (cartProductUse[0].quantity > 1) {
        let cartDetails = await cartModel.findOneAndUpdate({ _id: cartId, "items.productId": productId },
          { $inc: { "items.$.quantity": -1, totalPrice: -products.price } },
          { new: true }).populate([{ path: "items.productId" }])
        return res.status(200).send({
          status: true,
          message: "cart updated",
          data: cartDetails
        })
      }
    }
  } catch (err) {
    console.log(err)
    res.status(500).send({ status: false, message: err.message });
  }
}

//*************************************************GETCART APIS************************************************************************* */
const getCart = async function (req, res) {
  try {
    let userId = req.params.userId;
    if (!isValidObjectId(userId)) {
    
  return res.status(400).send({ status: false, message: "Please provide a valid userId" })
    }

    if (userId !== req.userId) {
      return res.status(403).send({ status: false, message: "You are not authorized for this cart" })//=> check authorization
    }
    const existCart = await cartModel.findOne({ userId: userId }).populate({ path: "items.productId" })
    if (!existCart) {
      return res.status(404).send({ status: false, message: "Cart is not exist" })
    }
    return res.status(200).send({ status: true, message: "Success", data: existCart })

  } catch (error) {
    return res.status(500).send({ status: false, message: error.message })

  }
}

const deleteCart = async function (req, res) {
  try {
    let userId = req.params.userId
    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, message: "Please provide a valid userId" })
    }
    if (userId !== req.userId) {
      return res.status(403).send({ status: false, message: "You are not authorized for this cart" })//=> check authorization
    }
    let checkUser = await userModel.findOne({ _id: userId })

    if (!checkUser) {
      return res.status(404).send({ status: false, message: "This User is Not Exist" })
    }
    let existCart = await cartModel.findOneAndUpdate({ userId: userId }, { items: [], totalItems: 0, totalPrice: 0 }, { new: true })
    if (!existCart) {
      return res.status(404).send({ status: false, message: "Cart is not exist for this user" })
    }
    if (existCart.items.length === 0) return res.status(400).send({ status: false, msg: "Cart is already empty" })

    return res.status(204).send({ status: true, message: "success", data: existCart })
  } catch (error) {
    return res.status(500).send({ status: false, message: error.message })
  }
}
module.exports = { createCart, updatedCart, getCart, deleteCart }
