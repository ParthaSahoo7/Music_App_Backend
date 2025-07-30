import express from "express";
import { check } from "express-validator";
import addressController from "./addressControllers.js";
import authorizeUser from "../../middlewares/authorizeUser.js";
const router = express.Router();

router.post(
  "/",
  [
    check("street", "Street is required").notEmpty(),
    check("city", "City is required").notEmpty(),
    check("state", "State is required")
      .notEmpty()
      .matches(/^[A-Z]{2}$/)
      .withMessage("State should be a 2-letter abbreviation"),
    check("postalCode", "Postal Code is required")
      .notEmpty()
      .matches(/^\d{5}(-\d{4})?$/)
      .withMessage("Invalid ZIP code format"),
    check("country", "Country is required").notEmpty(),
    check("phoneNumber", "Phone number is required")
      .notEmpty()
      .matches(/^\+?1?\d{10,15}$/)
      .withMessage("Invalid phone number format"),
  ],
  authorizeUser,
  addressController.addAddress
);

router.get(
  "/",
  authorizeUser,
  addressController.getAddresses
);

router.put(
  "/:id",
  [
    check("street", "Street is required").optional().notEmpty(),
    check("city", "City is required").optional().notEmpty(),
    check("state", "State should be a 2-letter abbreviation")
      .optional()
      .matches(/^[A-Z]{2}$/)
      .withMessage("State should be a 2-letter abbreviation"),
    check("postalCode", "Invalid ZIP code format")
      .optional()
      .matches(/^\d{5}(-\d{4})?$/)
      .withMessage("Invalid ZIP code format"),
    check("country", "Country is required").optional().notEmpty(),
    check("phoneNumber", "Invalid phone number format")
      .optional()
      .matches(/^\+?1?\d{10,15}$/)
      .withMessage("Invalid phone number format"),
    check("street2").optional().isString(),
    check("landmark").optional().isString(),
    check("deliveryInstructions").optional().isString(),
    check("isDefault").optional().isBoolean(),
  ],
  authorizeUser,
  addressController.updateAddress
);

router.delete(
  "/:id",
  authorizeUser,
  addressController.deleteAddress
);

router.get(
  "/default-address",
  authorizeUser,
  addressController.getDefaultAddress
);

router.get(
  "/:id",
  authorizeUser,
  addressController.getAddressById
);

router.put(
  "/default-address/:id",
  authorizeUser,
  addressController.setDefaultAddress
);

export default router;