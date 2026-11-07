import { Order } from "../models/order.model.js";
import { Address } from "../models/address.model.js";
import { User } from "../models/user.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";

// ========================
// ORDER CONTROLLER
// ========================

export const createOrder = asyncHandler(async (req, res) => {
    const { items, shippingAddressId, billingAddressId, paymentMethod } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    if (!items || items.length === 0) {
        throw new ApiError(400, "Order must contain at least one item");
    }

    if (!paymentMethod) {
        throw new ApiError(400, "Payment method is required");
    }

    // Fetch shipping address
    const shippingAddress = await Address.findOne({
        _id: shippingAddressId,
        userId,
    });

    if (!shippingAddress) {
        throw new ApiError(404, "Shipping address not found");
    }

    // Fetch billing address (if different from shipping)
    let billingAddress = shippingAddress;
    if (billingAddressId && billingAddressId !== shippingAddressId) {
        billingAddress = await Address.findOne({
            _id: billingAddressId,
            userId,
        });
        if (!billingAddress) {
            throw new ApiError(404, "Billing address not found");
        }
    }

    // Validate and calculate order items
    let subtotal = 0;
    const processedItems = [];

    for (const item of items) {
        const product = await Product.findById(item.productId);

        if (!product) {
            throw new ApiError(404, `Product ${item.productId} not found`);
        }

        // Check size stock when a size was selected, otherwise check aggregate stock.
        const sizeStocks = product.sizeStock || [];
        if (sizeStocks.length > 0) {
            if (item.size) {
                const sizeStock = sizeStocks.find((stock) => stock.size === item.size);
                if (!sizeStock || sizeStock.quantity < item.quantity) {
                    throw new ApiError(400, `Insufficient stock for ${product.productName} in size ${item.size}`);
                }
            } else if (product.totalQuantity < item.quantity) {
                throw new ApiError(400, `Insufficient stock for ${product.productName}`);
            }
        }

        const unitPrice = product.price;
        const totalPrice = unitPrice * item.quantity;
        subtotal += totalPrice;

        processedItems.push({
            productId: product._id,
            productName: product.productName,
            price: unitPrice,
            quantity: item.quantity,
            ...(item.size ? { size: item.size } : {}),
            totalPrice,
            productUrl: product.url,
        });
    }

    const shippingCost = subtotal > 500 ? 0 : 50; // Free shipping above 500
    const tax = Math.round(subtotal * 0.12 * 100) / 100; // 12% GST
    const total = subtotal + shippingCost + tax;

    // Create order
    const order = new Order({
        userId,
        items: processedItems,
        shippingAddress: {
            firstName: shippingAddress.firstName,
            lastName: shippingAddress.lastName,
            phoneNumber: shippingAddress.phoneNumber,
            email: shippingAddress.email,
            street: shippingAddress.street,
            city: shippingAddress.city,
            state: shippingAddress.state,
            pincode: shippingAddress.pincode,
            country: shippingAddress.country,
        },
        billingAddress: {
            firstName: billingAddress.firstName,
            lastName: billingAddress.lastName,
            phoneNumber: billingAddress.phoneNumber,
            email: billingAddress.email,
            street: billingAddress.street,
            city: billingAddress.city,
            state: billingAddress.state,
            pincode: billingAddress.pincode,
            country: billingAddress.country,
        },
        subtotal,
        shippingCost,
        tax,
        total,
        paymentMethod,
        paymentStatus: "PENDING",
        orderStatus: "PENDING",
        estimatedDelivery: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    await order.save();

    return res.status(201).json(
        new ApiResponse(201, order, "Order created successfully")
    );
});

export const getOrderHistory = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    const orders = await Order.find({ userId })
        .populate({
            path: "items.productId",
            select: "productName price url",
        })
        .sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, orders, "Order history fetched successfully")
    );
});

export const getOrderById = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    const order = await Order.findOne({ _id: orderId, userId }).populate({
        path: "items.productId",
        select: "productName price url description",
    });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    return res.status(200).json(
        new ApiResponse(200, order, "Order details fetched successfully")
    );
});

export const cancelOrder = asyncHandler(async (req, res) => {
    const { orderId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    const order = await Order.findOne({ _id: orderId, userId });

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    if (["SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"].includes(order.orderStatus)) {
        throw new ApiError(400, `Cannot cancel order with status: ${order.orderStatus}`);
    }

    order.orderStatus = "CANCELLED";
    order.paymentStatus = "REFUNDED";
    await order.save();

    return res.status(200).json(
        new ApiResponse(200, order, "Order cancelled successfully")
    );
});

// ========================
// ADDRESS CONTROLLER
// ========================

export const createAddress = asyncHandler(async (req, res) => {
    const { firstName, lastName, phoneNumber, email, street, city, state, pincode, country, addressType, isDefault } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    if (!firstName || !lastName || !phoneNumber || !email || !street || !city || !state || !pincode) {
        throw new ApiError(400, "All address fields are required");
    }

    const address = new Address({
        userId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phoneNumber: phoneNumber.trim(),
        email: email.trim().toLowerCase(),
        street: street.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country?.trim() || "India",
        addressType: addressType || "HOME",
        isDefault: isDefault || false,
    });

    await address.save();

    return res.status(201).json(
        new ApiResponse(201, address, "Address created successfully")
    );
});

export const getAddresses = asyncHandler(async (req, res) => {
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    const addresses = await Address.find({ userId }).sort({ createdAt: -1 });

    return res.status(200).json(
        new ApiResponse(200, addresses, "Addresses fetched successfully")
    );
});

export const updateAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
    const { firstName, lastName, phoneNumber, email, street, city, state, pincode, country, addressType, isDefault } = req.body;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    const address = await Address.findOne({ _id: addressId, userId });

    if (!address) {
        throw new ApiError(404, "Address not found");
    }

    // Update fields if provided
    if (firstName) address.firstName = firstName.trim();
    if (lastName) address.lastName = lastName.trim();
    if (phoneNumber) address.phoneNumber = phoneNumber.trim();
    if (email) address.email = email.trim().toLowerCase();
    if (street) address.street = street.trim();
    if (city) address.city = city.trim();
    if (state) address.state = state.trim();
    if (pincode) address.pincode = pincode.trim();
    if (country) address.country = country.trim();
    if (addressType) address.addressType = addressType;
    if (isDefault !== undefined) address.isDefault = isDefault;

    await address.save();

    return res.status(200).json(
        new ApiResponse(200, address, "Address updated successfully")
    );
});

export const deleteAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    const address = await Address.findOneAndDelete({ _id: addressId, userId });

    if (!address) {
        throw new ApiError(404, "Address not found");
    }

    return res.status(200).json(
        new ApiResponse(200, null, "Address deleted successfully")
    );
});

export const setDefaultAddress = asyncHandler(async (req, res) => {
    const { addressId } = req.params;
    const userId = req.user?._id;

    if (!userId) {
        throw new ApiError(401, "User not authenticated");
    }

    // Set all user addresses to not default
    await Address.updateMany({ userId }, { isDefault: false });

    // Set the requested address as default
    const address = await Address.findByIdAndUpdate(
        addressId,
        { isDefault: true },
        { new: true }
    );

    if (!address) {
        throw new ApiError(404, "Address not found");
    }

    return res.status(200).json(
        new ApiResponse(200, address, "Default address updated successfully")
    );
});
