import mongoose, { Schema } from "mongoose";

const orderItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    productName: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    size: {
        type: String,
        enum: ["S", "M", "L", "XL", "XXL"],
    },
    totalPrice: {
        type: Number,
        required: true,
    },
    productUrl: {
        type: String,
    },
}, { _id: true });

const orderSchema = new Schema(
    {
        userId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        items: [orderItemSchema],
        shippingAddress: {
            firstName: String,
            lastName: String,
            phoneNumber: String,
            email: String,
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: String,
            isDefault: Boolean,
        },
        billingAddress: {
            firstName: String,
            lastName: String,
            phoneNumber: String,
            email: String,
            street: String,
            city: String,
            state: String,
            pincode: String,
            country: String,
            isDefault: Boolean,
        },
        orderDate: {
            type: Date,
            default: Date.now,
        },
        subtotal: {
            type: Number,
            required: true,
        },
        shippingCost: {
            type: Number,
            default: 0,
        },
        tax: {
            type: Number,
            default: 0,
        },
        total: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ["CREDIT_CARD", "DEBIT_CARD", "UPI", "NET_BANKING", "WALLET"],
            required: true,
        },
        paymentStatus: {
            type: String,
            enum: ["PENDING", "COMPLETED", "FAILED", "REFUNDED"],
            default: "PENDING",
        },
        orderStatus: {
            type: String,
            enum: ["PENDING", "CONFIRMED", "SHIPPED", "DELIVERED", "CANCELLED", "RETURNED"],
            default: "PENDING",
        },
        transactionId: {
            type: String,
        },
        estimatedDelivery: {
            type: Date,
        },
        deliveredDate: {
            type: Date,
        },
        notes: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

export const Order = mongoose.model("Order", orderSchema);
