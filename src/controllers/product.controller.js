import { v2 as cloudinary } from "cloudinary";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/api-error.js";
import { ApiResponse } from "../utils/api-response.js";
import { asyncHandler } from "../utils/async-handler.js";
import { normalizeProductCategory } from "../utils/product-catalog.js";

export const getUploadSignature = asyncHandler(async (_req, res) => {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    {
      timestamp,
      folder: "ellegancesuit/products",
    },
    process.env.CLOUDINARY_API_SECRET
  );

  res.set("Cache-Control", "no-store");
  return res.status(200).json({
    timestamp,
    signature,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
  });
});

const normaliseProductPayload = (body = {}) => {
  const images = Array.isArray(body.images)
    ? body.images.map((item) => String(item).trim()).filter(Boolean).slice(0, 1)
    : [];

  const url = body.url?.trim() || images[0] || "";
  const category = normalizeProductCategory(body.category);

  const payload = {
    productName: body.productName?.trim(),
    category,
    description: body.description?.trim() || `${body.productName?.trim() || "Product"} - ${category || "fashion"} collection.`,
    url,
    images,
    price: Number(body.price),
    originalPrice: 999,
    totalQuantity: Number(body.totalQuantity ?? 0),
    rating: Number(body.rating ?? 0),
    isBestSeller: Boolean(body.isBestSeller),
    sizeStock: Array.isArray(body.sizeStock)
      ? body.sizeStock.map((item) => ({
          size: item.size,
          quantity: Number(item.quantity ?? 0),
        }))
      : [],
  };

  return payload;
};

const normalizeProductResponse = (product) => {
  const data = product.toObject();
  data.category = normalizeProductCategory(data.category) || data.category;
  return data;
};

export const getAllProducts = asyncHandler(async (_req, res) => {
  const products = await Product.find({}).sort({ createdAt: -1 });
  return res.status(200).json(new ApiResponse(200, products.map(normalizeProductResponse), "Products fetched successfully"));
});

export const getProductById = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(new ApiResponse(200, normalizeProductResponse(product), "Product fetched successfully"));
});

export const createProduct = asyncHandler(async (req, res) => {
  const payload = normaliseProductPayload(req.body);

  if (!payload.category || !payload.url || !payload.productName) {
    throw new ApiError(400, "A valid product name, category, and image URL are required");
  }
  if (!Number.isFinite(payload.price) || payload.price < 0) {
    throw new ApiError(400, "A valid product price is required");
  }

  const existingProduct = await Product.findOne({ productName: payload.productName.toLowerCase() });
  if (existingProduct) {
    throw new ApiError(409, "A product with this name already exists");
  }

  if (payload.sizeStock.length > 0) {
    payload.totalQuantity = payload.sizeStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  if (payload.images.length === 0) {
    payload.images = [payload.url];
  }

  const product = await Product.create({
    ...payload,
    productName: payload.productName,
    category: payload.category,
    price: payload.price,
    originalPrice: payload.originalPrice,
    totalQuantity: payload.totalQuantity,
    description: payload.description,
    url: payload.url,
    images: payload.images,
    rating: payload.rating,
    isBestSeller: payload.isBestSeller,
    sizeStock: payload.sizeStock,
  });

  return res.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

export const updateProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const updateData = {};

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const allowedFields = [
    "productName",
    "category",
    "price",
    "description",
    "url",
    "totalQuantity",
    "rating",
    "sizeStock",
    "images",
    "isBestSeller",
  ];

  for (const field of allowedFields) {
    if (field in req.body) {
      const value = req.body[field];
      if (field === "sizeStock") {
        updateData[field] = Array.isArray(value)
          ? value.map((item) => ({ size: item.size, quantity: Number(item.quantity ?? 0) }))
          : [];
      } else if (field === "images") {
        updateData.images = Array.isArray(value)
          ? value.map((item) => String(item).trim()).filter(Boolean).slice(0, 1)
          : [];
      } else if (field === "category") {
        const category = normalizeProductCategory(value);
        if (!category) throw new ApiError(400, "A valid product category is required");
        updateData.category = category;
      } else if (field === "isBestSeller") {
        updateData[field] = Boolean(value);
      } else if (["productName", "description", "url"].includes(field)) {
        updateData[field] = String(value).trim();
      } else if (field === "price") {
        const price = Number(value);
        if (!Number.isFinite(price) || price < 0) {
          throw new ApiError(400, "A valid product price is required");
        }
        updateData.price = price;
      } else {
        updateData[field] = Number(value);
      }
    }
  }

  if (updateData.sizeStock && updateData.sizeStock.length > 0) {
    updateData.totalQuantity = updateData.sizeStock.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);
  }

  if (updateData.images && updateData.images.length > 0 && !updateData.url) {
    updateData.url = updateData.images[0];
  }

  if (Object.keys(updateData).length === 0) {
    throw new ApiError(400, "No valid fields were provided for update");
  }

  const updatedProduct = await Product.findByIdAndUpdate(productId, updateData, {
    new: true,
    runValidators: true,
  });

  return res.status(200).json(new ApiResponse(200, normalizeProductResponse(updatedProduct), "Product updated successfully"));
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const { productId } = req.params;

  const product = await Product.findByIdAndDelete(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res.status(200).json(new ApiResponse(200, { deletedProductId: productId }, "Product deleted successfully"));
});