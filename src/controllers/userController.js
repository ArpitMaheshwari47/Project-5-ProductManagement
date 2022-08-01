const userModel = require("../models/userModel")
const bcrypt = require("bcrypt")
const mongoose = require("mongoose")
const jwt = require("jsonwebtoken")
const pinValidator = require('pincode-validator')
const { isValidObjectId } = require('mongoose')

const { uploadFile, isValidFiles, isValid, isValidRequestBody, nameRegex, emailRegex, phoneRegex, passRegex } = require("../validator/validation")

//*****************************************************REGISTER USER****************************************************************** */
const registerUser = async (req, res) => {
  try {
    let data = req.body
    if (Object.keys(data).length === 0) return res.status(400).send({ status: false, message: "Provide the data in body." })

    let { fname, lname, email, phone, password, address } = data



    const files = req.files
    if (!isValidFiles(files)) return res.status(400).send({ status: false, Message: "Please provide user's profile picture", })
    if (!isValid(fname))
      return res.status(400).send({ status: false, message: "Please enter the user name." })
    if (!nameRegex.test(fname))
      return res.status(400).send({ status: false, message: "fname should contain alphabets only." })
    if (!isValid(lname))
      return res.status(400).send({ status: false, message: "Please enter the user last name." })
    if (!nameRegex.test(lname))
      return res.status(400).send({ status: false, message: "lname should contain alphabets only." })
    if (!isValid(email))
      return res.status(400).send({ status: false, message: "Please enter the email." })
    if (!emailRegex.test(email))
      return res.status(400).send({ status: false, message: "Please enter a valid emailId." })
    let getEmail = await userModel.findOne({ email: email });
    if (getEmail) {
      return res.status(400).send({ status: false, message: "Email is already in use, please enter a new one." });
    }
    if (!isValid(phone))
      return res.status(400).send({ status: false, message: "Please enter the phone number." })
    if (!phoneRegex.test(phone))
      return res.status(400).send({ status: false, message: "Enter the phone number in valid Indian format." })
    let getPhone = await userModel.findOne({ phone: phone });
    if (getPhone) {
      return res.status(400).send({ status: false, message: "Phone number is already in use, please enter a new one." });
    }
    if (!isValid(password))
      return res.status(400).send({ status: false, message: "Please enter the password." })
    if (!passRegex.test(password))
      return res.status(400).send({ status: false, message: "Password length should be alphanumeric with 8-15 characters, should contain at least one lowercase, one uppercase and one special character." })
    const saltRounds = 10;
    const encryptedPassword = await bcrypt.hash(password, saltRounds)
    console.log(encryptedPassword)
    data['password'] = encryptedPassword
    if (address) {
      let objAddress = JSON.parse(address);
      if (objAddress.shipping) {
        if (!isValid(objAddress.shipping.street)) { return res.status(400).send({ status: false, Message: "Please provide street and street name in shipping address", }) }
        if (!isValid(objAddress.shipping.city))
          return res.status(400).send({ status: false, Message: "Please provide city name in shipping address", });
        if (!nameRegex.test(objAddress.shipping.city))
          return res.status(400).send({ status: false, message: "city name should contain alphabets only(shipping)." })
        if (!isValid(objAddress.shipping.pincode))
          return res.status(400).send({ status: false, Message: "Please provide pincode in shipping address", });
        let pinValidated = pinValidator.validate(objAddress.shipping.pincode)
        if (!pinValidated) return res.status(400).send({ status: false, message: "Please enter a valid pincode." })
      } else {
        return res.status(400).send({ status: false, Message: "Please provide shipping address and it should be present in object with all mandatory fields", });
      }

      if (objAddress.billing) {
        if (!isValid(objAddress.billing.street))
          return res.status(400).send({ status: false, Message: "Please provide street name in billing address", });
        if (!isValid(objAddress.billing.city))
          return res.status(400).send({ status: false, Message: "Please provide city name in billing address", });
        if (!nameRegex.test(objAddress.billing.city))
          return res.status(400).send({ status: false, message: "city name should contain alphabets only(billing)." })
        if (!isValid(objAddress.billing.pincode))
          return res.status(400).send({ status: false, Message: "Please provide pincode in billing address", });
        if (!isValid(objAddress.billing.pincode))
          return res.status(400).send({ status: false, Message: "Please provide pincode in billing address", });
      } else {
        return res.status(400).send({ status: false, Message: "Please provide billing address and it should be present in object with all mandatory fields" });
      }
      data["address"] = objAddress;
    } else {
      return res.status(400).send({ status: true, msg: "Please Provide The Address" })
    }
    if (files && files.length > 0) {
      let url = await uploadFile(files[0]);
      data["profileImage"] = url;
    } else {
      return res.status(400).send({ status: false, msg: "Please Provide ProfileImage" });
    }
    const createUser = await userModel.create(data)
    return res.status(201).send({ status: true, message: `User registered successfully`, data: createUser, })
  } catch (error) {
    res.status(500).send({ status: false, message: error.message })
  }
}
//******************************************** LOGIN API ****************************************************************************** */
const loginUser = async function (req, res) {
  try {
    const data = req.body
    const { email, password } = data
    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Please enter login credentials" });
    }

    if (!isValid(email)) {
      return res.status(400).send({ status: false, message: "Email is requird and it should be a valid email address" });
    }
    if (!emailRegex.test(email))
      return res.status(400).send({ status: false, message: "Please enter a valid emailId." })
    if (!isValid(password)) {
      return res.status(400).send({ status: false, message: "Password  should be Valid min 8 and max 15 length" });
    }
    if (!passRegex.test(password))
      return res.status(400).send({ status: false, message: "Password length should be alphanumeric with 8-15 characters, should contain at least one lowercase, one uppercase and one special character." })
    const user = await userModel.findOne({ email: email });
    if (!user) {
      return res.status(404).send({ status: false, msg: "Invalid User" })
    }
    const decrypPassword = user.password
    const pass = await bcrypt.compare(password, decrypPassword)
    if (!pass) {
      return res.status(400).send({ status: false, message: "Password Incorrect" })
    }

    // Creating Token Here

    const token = jwt.sign({ userId: user._id }, 'project5', { expiresIn: "24h" })

    let obj = {
      userId: user._id,
      token: token
    }
    res.setHeader('Authorization', 'Bearer ' + token);

    return res.status(201).send({ status: true, msg: "User LoggedIn Succesfully", data: obj })

  }
  catch (err) {
    return res.status(500).send({ status: false, msg: err.message })
  }
}

//******************************************** GET USER API******************************************************

const getUserById = async (req, res) => {
  try {

    let userId = req.params.userId
    if (!userId) {
      return res.status(400).send({ status: false, msg: "Provide UserID" })
    }

    if (!isValidObjectId(userId)) {
      return res.status(400).send({ stauts: false, msg: "Invalid User Id" })
    }
    const data = await userModel.findById({ _id: userId })
    if (data) {
      return res.status(200).send({ status: true, data: data })
    }
    else {
      return res.status(404).send({ status: false, msg: "No data Found" })
    }
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.name })
  }

}

//******************************************** UPDATEUSER API***********************************************



const updateUserProfile = async function (req, res) {
  try {
    const userId = req.params.userId;
    const data = req.body
    const files = req.files
    let { profileImage, fname, lname, email, phone, password, address } = data
    // body is empty
    if (!isValidRequestBody(data)) {
      return res.status(400).send({ status: false, message: "Please provide data for update" });
    }
    if (!isValidObjectId(userId)) {
      return res.status(400).send({ status: false, msg: "Invalid User Id" })
    }
    const isUserPresent = await userModel.findById(userId)
    if (!isUserPresent) {
      return res.status(404).send({ status: false, msg: "No User Found" })
    }
    // authorization
    if (userId != req.userId) {
      return res.status(403).send({ status: false, message: "unauthorized access!" });
    }
    // validation parts
    let newObj = {}
    let bodyFromReq = JSON.parse(JSON.stringify(data));
    if (bodyFromReq.hasOwnProperty("profileImage")){
      if (!isValidFiles(profileImage)) return res.status(400).send({ status: false, Message: "Please provide user's profile picture", })
      newObj["profileImage"] = profileImage
    }
    if (bodyFromReq.hasOwnProperty("fname")){
      if (!isValid(fname)) { return res.status(400).send({ status: false, msg: "Provide the First Name " }) }
    if (!nameRegex.test(fname))
      return res.status(400).send({ status: false, message: "name should contain alphabets only." })
      newObj["fname"] = fname
    }
    if (bodyFromReq.hasOwnProperty("lname")){
      if (!isValid(lname)) { return res.status(400).send({ status: false, msg: "Provide the last Name " }) }
    if (!nameRegex.test(lname))
      return res.status(400).send({ status: false, message: "name should contain alphabets only." })
      newObj["lname"] = lname
    }
    if (bodyFromReq.hasOwnProperty("email")){
      if (!isValid(email)) { return res.status(400).send({ status: false, msg: "email Provide the email " }) }
    if (!emailRegex.test(email))
      return res.status(400).send({ status: false, message: "Please enter a valid emailId." })
      let getEmail = await userModel.findOne({ email: email });
      if (getEmail) {
        return res.status(400).send({ status: false, message: "Email is already in use, please enter a new one." });
      }
      newObj["email"] = email
    }
    if (bodyFromReq.hasOwnProperty("phone")){
   if (!isValid(phone))
  return res.status(400).send({ status: false, message: "Please enter the phone number." })
    if (!phoneRegex.test(phone))
      return res.status(400).send({ status: false, message: "Enter the phone number in valid Indian format." })
      let getPhone = await userModel.findOne({ phone: phone });
      if (getPhone) {
        return res.status(400).send({ status: false, message: "Phone number is already in use, please enter a new one." });
      }
      newObj["phone"] = phone
    }
    if (bodyFromReq.hasOwnProperty("password")){
      if (!isValid(password))
        return res.status(400).send({ status: false, message: "Please enter the password." })
    if (!passRegex.test(password))
      return res.status(400).send({ status: false, message: "Password length should be alphanumeric with 8-15 characters, should contain at least one lowercase, one uppercase and one special character." })
        const saltRounds = 10;
        const encryptedPassword = await bcrypt.hash(password, saltRounds)
        newObj['password'] = encryptedPassword
      }
    if (bodyFromReq.hasOwnProperty('address')) {
      if (address) {
        let objAddress = JSON.parse(address)
        let add = isUserPresent.address
        if (objAddress.shipping) {
          if (objAddress.shipping.street) {
            if (!isValid(objAddress.shipping.street)) {
              return res.status(400).send({ status: false, Message: "Please provide street name in shipping address" })
            }
            add.shipping.street = objAddress.shipping.street
          }
          if (objAddress.shipping.city) {
            if (!isValid(objAddress.shipping.city)) {
              return res.status(400).send({ status: false, Message: "Please provide city name in shipping address" })
            }
            if (!nameRegex.test(data.address.shipping.city)) {
              return res.status(400).send({ status: false, msg: "Enter valid  city name not a number" })
            }
            add.shipping.city = objAddress.shipping.city
          }
          if (objAddress.shipping.pincode) {
            if (!isValid(objAddress.shipping.pincode)) {
              return res.status(400).send({ status: false, Message: "Please provide pincode in shipping address" })
            }
            add.shipping.pincode = objAddress.shipping.pincode
          }
        }
        if (objAddress.billing) {
          if (objAddress.billing.street) {
            if (!isValid(objAddress.billing.street)) {
              return res.status(400).send({ status: false, Message: "Please provide street name in billing address" })
            }
            add.billing.street = objAddress.billing.street
          }
          if (objAddress.billing.city) {
            if (!isValid(objAddress.billing.city)) {
              return res.status(400).send({ status: false, Message: "Please provide city name in billing address" })
            }
            if (!nameRegex.test(data.address.billing.city)) {
              return res.status(400).send({ status: false, msg: "Enter valid  city name not a number" })
            }
            add.billing.city = objAddress.billing.city
          }
          if (objAddress.billing.pincode) {
            if (!isValid(objAddress.billing.pincode)) {
              return res.status(400).send({ status: false, Message: "Please provide pincode in billing address" })
            }
            let pinValidated = pinValidator.validate(objAddress.billing.pincode)
               if (!pinValidated) return res.status(400).send({ status: false, message: "Please enter a valid pincode." })
            add.billing.pincode = objAddress.billing.pincode
          }
        }
        newObj['address'] = add
      } else {
        return res.status(400).send({ status: true, msg: "Please Provide The Address" })
      }
    }
    if (files && files.length > 0) {
      let url = await uploadFile(files[0])
      data['profileImage'] = url
    }
    const updateData = await userModel.findByIdAndUpdate({ _id: userId }, { $set: newObj  }, { new:true })
    return res.status(201).send({ status: true, message: "user profile update", data: updateData });
  } catch (err) {
    return res.status(500).send({ status: false, msg: err.message })
  }
}

module.exports = { registerUser, loginUser, getUserById, updateUserProfile }
