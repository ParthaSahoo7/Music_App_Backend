import express from "express";
import { check } from "express-validator";

import addressController from "./addressControllers.js";
import authorizeUser from "../../middlewares/authorizeUser.js";
const router = express.Router();


router.post(
  "/add-address",
  [
    check("addressLine1", "Address Line 1 is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("state", "State is required").notEmpty(),
    check("postalCode", "Postal Code is required").notEmpty(),
    check("country", "Country is required").notEmpty(),
  ],
  authorizeUser,
  addressController.addAddress
);

router.get(
  "/get-addresses",
  authorizeUser,
  addressController.getAddresses
);
router.put(
  "/update-address/:id",
  [
    check("addressLine1", "Address Line 1 is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("state", "State is required").notEmpty(),
    check("postalCode", "Postal Code is required").notEmpty(),
    check("country", "Country is required").notEmpty(),
  ],
  authorizeUser,
  addressController.updateAddress
);
router.delete(
  "/delete-address/:id",
  authorizeUser,
  addressController.deleteAddress
);

router.get(
  "/get-address/:id",
  authorizeUser,
  addressController.getAddressById
);

router.get(
  "/get-default-address",
  authorizeUser,
  addressController.getDefaultAddress
);

router.put(
  "/set-default-address/:id",
  authorizeUser,
  addressController.setDefaultAddress
);

// export default router;
 export default router;

