import mongoose, { Schema } from "mongoose";

const sizeStockSchema = new Schema(
    {
        size: {
            type: String,
            enum: ["S", "M", "L", "XL", "XXL", "3XL", "4XL", "5XL", "6XL"],
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
    },
    { _id: false }
);

const productSchema = new Schema(
    {
        productName: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true,
        },
        category: {
            type: String,
            enum: ["Suit", "Saree", "Lehenga", "Kurti", "Sharara"],
            required: true,
            trim: true,
        },
        price: {
            type: Number,
            required: true,
            min: 0,
        },
        originalPrice: {
            type: Number,
            required: true,
            default: 999,
            min: 0,
        },
        description: {
            type: String,
            required: false,
            trim: true,
        },
        sizeStock: [sizeStockSchema],
        totalQuantity: {
            type: Number,
            required: true,
            default: 0,
            min: 0,
        },
        url: {
            type: String,
            required: false,
        },
        images: {
            type: [String],
            default: [],
            validate: {
                validator: function (value) {
                    return value.length <= 1;
                },
                message: "A product can have at most 1 image",
            },
        },
        isBestSeller: {
            type: Boolean,
            default: false,
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5,
        },
        reviews: [
            {
                userId: Schema.Types.ObjectId,
                rating: Number,
                comment: String,
                createdAt: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
    }
);

export const Product = mongoose.model("Product", productSchema);