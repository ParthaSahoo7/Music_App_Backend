// get user profile
// get all user
// update user
// delete user

import express from "express";
import { check, validationResult } from "express-validator";
import authorizeUser from "../../middlewares/authorizeUser.js";
import profileController from "./profileController.js";
