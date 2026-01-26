import db from "../configs/database";
import { Request, Response } from "express"
import { ResultSetHeader, RowDataPacket } from "mysql2"; 
import { ZodError } from "zod";
import { createProductSchema, updateProductSchema } from "../validators/products.schema";

// controller to create/insert new product
export const createProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // validate inputs from request body
    const validateProductData = createProductSchema.parse(req.body);

    const { name, price, category_id, description, stock, image_url } = validateProductData;

    // check if category truly exists
    const [categoryRows] = await db.query<RowDataPacket[]>("SELECT id, name FROM categories WHERE id = ?", [category_id]);

    if(categoryRows.length === 0) {
      res.status(404).json({
        success: false,
        error: "Category not found!"
      });
      return;
    }

    // check if product with the same name and category already exist
    const [existingProductRows] = await db.query<RowDataPacket[]>("SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND category_id = ?", [name, category_id]);

    if(existingProductRows.length > 0) {
      res.status(409).json({
        success: false,
        error: "Product with this name already exists in the category!"
      });
      return;
    }

    // insert product into the database
    await db.query<ResultSetHeader>("INSERT INTO products (name, price, category_id, description, stock, image_url) VALUES (?, ?, ?, ?, ?, ?)", [name, price, category_id, description || null, stock, image_url || null]);

    res.status(201).json({
      success: true,
      message: "Product created successfully!✅",
      product: {
        category_id,
        name,
        description,
        price: Number(price),
        stock,
        category_name: categoryRows[0]!.name,
        image_url: image_url || null,
      }
    });
    return;

  } catch(err: unknown) {
      // check if the error comes from zod
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          issues: err.issues,
        });
        return;
      } 

      console.error("Failed to create product: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error whiles creating product!"
      });
      return
  }
}

// controller to get all products
export const getAllProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    // get request query params
    const { search, sortBy, order, page, limit } = req.query;

    // base query with join to fetch category details
    let query = `
      SELECT 
        p.id,
        p.name,
        p.price,
        p.stock,
        p.image_url,
        p.created_at,
        c.id AS category_id,
        c.name AS category_name
      FROM products p
      JOIN categories c ON p.category_id = c.id
    `;

    const params: (string | number)[] = [];

    // search by product name (case-insensitive)
    if (search && typeof search === "string") {
      query += " WHERE LOWER(p.name) LIKE LOWER(?)";
      params.push(`%${search}%`);
    }

    // whitelist sorting columns
    let sortColumn = "p.created_at";

    if (sortBy === "name") sortColumn = "p.name";
    if (sortBy === "price") sortColumn = "p.price";
    if (sortBy === "stock") sortColumn = "p.stock";

    // sorting order (ASC or DESC)
    const sortOrder =
      typeof order === "string" && order.toUpperCase() === "DESC"
        ? "DESC"
        : "ASC";

    query += ` ORDER BY ${sortColumn} ${sortOrder}`;

    // pagination (page-based)
    const pageNumber = page ? Number(page) : 1;
    const pageLimit = limit ? Number(limit) : 20;
    const offset = (pageNumber - 1) * pageLimit;

    query += " LIMIT ? OFFSET ?";
    params.push(pageLimit, offset);

    // execute query
    const [products] = await db.query<RowDataPacket[]>(query, params);

    if (products.length === 0) {
      res.status(200).json({
        success: true,
        counts: 0,
        message: "No products found",
        products: [],
      });
      return;
    }

    res.status(200).json({
      success: true,
      counts: products.length,
      page: pageNumber,
      limit: pageLimit,
      message: "Products fetched successfully!✅",
      products,
    });
    return;

  } catch (err: unknown) {
    console.error("Failed to get all products: ", err);
    res.status(500).json({
      success: false,
      error: "Internal server error whiles getting all products!",
    });
    return;
  }
};

// controller to get product by id
export const getProductById = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const { id } = req.params;

    const [rows] = await db.query<RowDataPacket[]>("SELECT p.id, p.name, p.price, p.stock, p.description, p.image_url, p.created_at, p.updated_at, c.id AS category_id, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?", [id])

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No product found!"
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product found!✅",
      count: 1,
      product: {
        ...rows[0],
        price: Number(rows[0]!.price)
      }
    });
    return;

  } catch(err: unknown) {
      console.error("Failed to get the product: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while getting the product"
      });
      return;
    }
}

// controller to update product
export const updateProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const { id } = req.params;

    // validate prodcut inputs data
    const validatedProductData = updateProductSchema.parse(req.body);
    const { name, price, category_id, description, stock, image_url } = validatedProductData;

    // check if product exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT name FROM products WHERE id = ?", [id]);

    if(rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No prodcut found to update",
      });
      return;
    }

    // validate category if category_id is provided
    if (category_id !== undefined) {
      const [categoryRows] = await db.query<RowDataPacket[]>("SELECT id FROM categories WHERE id = ?", [category_id]);

      if (categoryRows.length === 0) {
        res.status(404).json({
          success: false,
          error: "Category not found",
        });
        return;
      }
    }

     // check for duplicate upon update
    if(name !== undefined) {
      // check if product with the same name and category already exist
      const [existingProductRows] = await db.query<RowDataPacket[]>("SELECT id FROM products WHERE LOWER(name) = LOWER(?) AND category_id = ? AND id != ?", [name, category_id, id]);

      if(existingProductRows.length > 0) {
        res.status(409).json({
          success: false,
          error: "Product already exists"
        });
        return;
      }
    }

    const fields: string[] = [];
    const values: (string | string[] | number | undefined)[] = [];

    if(name !== undefined) {
      fields.push("name = ?");
      values.push(name);
    }
    if(price !== undefined) {
      fields.push("price = ?");
      values.push(price);
    }
    if(category_id !== undefined) {
      fields.push("category_id = ?");
      values.push(category_id);
    }
    if(description !== undefined) {
      fields.push("description = ?");
      values.push(description);
    }
    if(stock !== undefined) {
      fields.push("stock = ?");
      values.push(stock);
    }
    if(image_url !== undefined) {
      fields.push("image_url = ?");
      values.push(image_url);
    }

    if(fields.length === 0) {
      res.status(400).json({
        success: false,
        error: "No field provided to udpate priduct"
      });
      return;
    }

    values.push(id);

     // update prodcut
    const [result] = await db.query<ResultSetHeader>(`UPDATE products SET ${fields.join(", ")} WHERE id = ?`, values);

    if(result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Unable to update product"
      });
      return;
    }

    // fetch the updated product details
    const [updatedProduct] = await db.query<RowDataPacket[]>("SELECT p.id, p.name, p.price, p.stock, p.description, p.image_url, p.created_at, p.updated_at, c.id AS category_id, c.name AS category_name FROM products p JOIN categories c ON p.category_id = c.id WHERE p.id = ?", [id]);

    res.status(200).json({
      success: true,
      message: "product updated successfully!✅",
      count: 1,
      product: {
        ...updatedProduct[0],
        price: Number(updatedProduct[0]!.price)
      }
    });
    return;

  } catch(err: unknown) {
      if (err instanceof ZodError) {
        res.status(400).json({
          success: false,
          error: "Invalid request data",
          issues: err.issues,
        });
        return;
      }

      console.error("Failed to update product: ", err);
      res.status(500).json({
        success: false,
        error: "Internal server error while updating product"
      });
      return;
  }
}

// controller to delete product
export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    // get id from request params
    const { id } = req.params;

    // check if product exists
    const [rows] = await db.query<RowDataPacket[]>("SELECT id, name FROM products WHERE id = ?", [id]);

    if (rows.length === 0) {
      res.status(404).json({
        success: false,
        error: "No product found to delete",
      });
      return;
    }

    // check if any sales item is using the product
    const [salesItems] = await db.query<RowDataPacket[]>("SELECT id FROM sale_items WHERE product_id = ?", [id]);

    if(salesItems.length > 0) {
      res.status(409).json({
        success: false,
        error: "Product cannot be deleted because it is used by existing sale item(s)"
      });
      return;
    }

    // delete product
    const [result] = await db.query<ResultSetHeader>("DELETE FROM products WHERE id = ?", [id]);

    if (result.affectedRows === 0) {
      res.status(500).json({
        success: false,
        error: "Failed to delete product",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Product deleted successfully!✅",
      product: {
        id,
        name: rows[0]!.name,
      },
    });
    return;

  } catch (err: unknown) {
    console.error("Failed to delete product: ", err);
    res.status(500).json({
      success: false,
      error: "Internal server error while deleting product",
    });
    return;
  }
};
