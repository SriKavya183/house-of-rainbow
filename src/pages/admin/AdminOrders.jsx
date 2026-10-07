import React, { useEffect, useRef, useState } from "react";

const API = "/api";

const CATEGORIES = [
  "Earrings",
  "Hair Accessories",
  "Hair Clips",
  "Jewellery",
  "Bangles",
  "Gift Hampers",
];

const emptyProduct = {
  name: "",
  description: "",
  price: "",
  category: "Earrings",
  stock_quantity: 0,
  featured: false,
  image: "",
  images: [],
};

export default function AdminOrders() {
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);

  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [product, setProduct] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);

  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);

  const fileInputRef = useRef(null);

  // --------------------------------------------------
  // CHECK ADMIN SESSION
  // --------------------------------------------------

  useEffect(() => {
    checkSession();
  }, []);

  async function checkSession() {
    try {
      const res = await fetch(`${API}/admin/session`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setAuthenticated(Boolean(data?.authenticated));
      }
    } catch (error) {
      console.error("Session check failed:", error);
    } finally {
      setCheckingSession(false);
    }
  }

  // --------------------------------------------------
  // LOGIN
  // --------------------------------------------------

  async function handleLogin(e) {
    e.preventDefault();

    if (!loginPassword.trim()) {
      setLoginError("Please enter admin password.");
      return;
    }

    setLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch(`${API}/admin/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          password: loginPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Incorrect password.");
      }

      setAuthenticated(true);
      setLoginPassword("");
      setLoginError("");
    } catch (error) {
      setLoginError(error.message || "Login failed.");
    } finally {
      setLoggingIn(false);
    }
  }

  // --------------------------------------------------
  // LOGOUT
  // --------------------------------------------------

  async function handleLogout() {
    try {
      await fetch(`${API}/admin/logout`, {
        method: "POST",
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout failed:", error);
    }

    setAuthenticated(false);
  }

  // --------------------------------------------------
  // LOAD PRODUCTS
  // --------------------------------------------------

  async function loadProducts() {
    setLoadingProducts(true);

    try {
      const res = await fetch(`${API}/products`);

      if (!res.ok) {
        throw new Error("Failed to load products.");
      }

      const data = await res.json();

      const productList = Array.isArray(data)
        ? data
        : Array.isArray(data?.products)
        ? data.products
        : [];

      setProducts(productList);
    } catch (error) {
      console.error("Products loading failed:", error);
      alert("Unable to load products.");
    } finally {
      setLoadingProducts(false);
    }
  }

  // --------------------------------------------------
  // LOAD ORDERS
  // --------------------------------------------------

  async function loadOrders() {
    setLoadingOrders(true);

    try {
      const res = await fetch(`${API}/admin/orders`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load orders.");
      }

      const data = await res.json();

      const orderList = Array.isArray(data)
        ? data
        : Array.isArray(data?.orders)
        ? data.orders
        : [];

      setOrders(orderList);
    } catch (error) {
      console.error("Orders loading failed:", error);
      alert("Unable to load orders.");
    } finally {
      setLoadingOrders(false);
    }
  }

  useEffect(() => {
    if (!authenticated) return;

    loadProducts();
    loadOrders();
  }, [authenticated]);

  // --------------------------------------------------
  // PRODUCT FORM
  // --------------------------------------------------

  function handleProductChange(e) {
    const { name, value, type, checked } = e.target;

    setProduct((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  // --------------------------------------------------
  // IMAGE SELECTION - ONE BY ONE
  // --------------------------------------------------

  function handleImageChange(e) {
    const files = Array.from(e.target.files || []);

    if (!files.length) return;

    const currentCount = imageFiles.length;
    const remainingSlots = 4 - currentCount;

    if (remainingSlots <= 0) {
      alert("Maximum 4 images allowed.");
      e.target.value = "";
      return;
    }

    if (files.length > remainingSlots) {
      alert(
        `You can add only ${remainingSlots} more image${
          remainingSlots > 1 ? "s" : ""
        }. Maximum 4 images allowed.`
      );

      e.target.value = "";
      return;
    }

    const validFiles = [];

    for (const file of files) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        alert(`${file.name} is not a JPG, PNG, or WEBP image.`);
        continue;
      }

      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} is larger than 5MB.`);
        continue;
      }

      validFiles.push(file);
    }

    if (!validFiles.length) {
      e.target.value = "";
      return;
    }

    setImageFiles((prev) => [...prev, ...validFiles]);

    const newPreviews = validFiles.map((file) => ({
      type: "new",
      url: URL.createObjectURL(file),
      file,
    }));

    setImagePreviews((prev) => [...prev, ...newPreviews]);

    // Allows selecting another image after this one
    e.target.value = "";
  }

  // --------------------------------------------------
  // REMOVE NEW IMAGE
  // --------------------------------------------------

  function removeNewImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index));

    setImagePreviews((prev) => {
      const removed = prev[index];

      if (removed?.type === "new" && removed.url) {
        URL.revokeObjectURL(removed.url);
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  // --------------------------------------------------
  // EDIT PRODUCT
  // --------------------------------------------------

  function startEdit(productItem) {
    const existingImages = Array.isArray(productItem?.images)
      ? productItem.images
      : productItem?.images
      ? parseImages(productItem.images)
      : productItem?.image
      ? [productItem.image]
      : [];

    const limitedImages = existingImages.filter(Boolean).slice(0, 4);

    setEditingId(productItem.id);

    setProduct({
      name: productItem.name || "",
      description: productItem.description || "",
      price: productItem.price ?? "",
      category: productItem.category || "Earrings",
      stock_quantity: productItem.stock_quantity ?? 0,
      featured: Boolean(productItem.featured),
      image: productItem.image || limitedImages[0] || "",
      images: limitedImages,
    });

    setImageFiles([]);

    setImagePreviews(
      limitedImages.map((url) => ({
        type: "existing",
        url,
      }))
    );

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // --------------------------------------------------
  // CANCEL EDIT
  // --------------------------------------------------

  function cancelEdit() {
    clearProductForm();
  }

  // --------------------------------------------------
  // CLEAR PRODUCT FORM
  // --------------------------------------------------

  function clearProductForm() {
    imagePreviews.forEach((item) => {
      if (item.type === "new" && item.url) {
        URL.revokeObjectURL(item.url);
      }
    });

    setEditingId(null);
    setProduct(emptyProduct);
    setImageFiles([]);
    setImagePreviews([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // --------------------------------------------------
  // UPLOAD IMAGES
  // --------------------------------------------------

  async function uploadProductImages() {
    if (!imageFiles.length) {
      return [];
    }

    if (imageFiles.length > 4) {
      throw new Error("Maximum 4 images are allowed.");
    }

    setUploadingImages(true);

    try {
      const formData = new FormData();

      imageFiles.forEach((file) => {
        formData.append("images", file);
      });

      const res = await fetch(`${API}/admin/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Image upload failed.");
      }

      return Array.isArray(data?.images) ? data.images : [];
    } finally {
      setUploadingImages(false);
    }
  }

  // --------------------------------------------------
  // SAVE PRODUCT
  // --------------------------------------------------

  async function saveProduct(e) {
    e.preventDefault();

    if (!product.name.trim()) {
      alert("Please enter product name.");
      return;
    }

    if (!product.price || Number(product.price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    if (!product.category) {
      alert("Please select a category.");
      return;
    }

    if (Number(product.stock_quantity) < 0) {
      alert("Stock quantity cannot be negative.");
      return;
    }

    if (imagePreviews.length > 4) {
      alert("Maximum 4 images allowed.");
      return;
    }

    setSavingProduct(true);

    try {
      // Upload newly selected images
      const uploadedImages = await uploadProductImages();

      // Keep existing images + uploaded images
      const existingImages = imagePreviews
        .filter((item) => item.type === "existing")
        .map((item) => item.url);

      const finalImages = [...existingImages, ...uploadedImages].slice(0, 4);

      const payload = {
        name: product.name.trim(),
        description: product.description.trim(),
        price: Number(product.price),
        category: product.category,
        stock_quantity: Number(product.stock_quantity) || 0,
        featured: Boolean(product.featured),
        image: finalImages[0] || "",
        images: finalImages,
      };

      const url = editingId
        ? `${API}/admin/products/${editingId}`
        : `${API}/admin/products`;

      const method = editingId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to save product.");
      }

      alert(editingId ? "Product updated successfully." : "Product added successfully.");

      clearProductForm();
      await loadProducts();
    } catch (error) {
      console.error("Save product error:", error);
      alert(error.message || "Unable to save product.");
    } finally {
      setSavingProduct(false);
    }
  }

  // --------------------------------------------------
  // DELETE PRODUCT
  // --------------------------------------------------

  async function deleteProduct(productId) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${API}/admin/products/${productId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete product.");
      }

      alert("Product deleted successfully.");

      if (editingId === productId) {
        clearProductForm();
      }

      await loadProducts();
    } catch (error) {
      console.error("Delete product error:", error);
      alert(error.message || "Unable to delete product.");
    }
  }

  // --------------------------------------------------
  // UPDATE STOCK
  // --------------------------------------------------

  async function updateStock(productItem, value) {
    const stock = Math.max(0, Number(value) || 0);

    try {
      const res = await fetch(`${API}/admin/products/${productItem.id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...productItem,
          stock_quantity: stock,
          images: parseImages(productItem.images),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update stock.");
      }

      await loadProducts();
    } catch (error) {
      console.error("Stock update error:", error);
      alert(error.message || "Unable to update stock.");
    }
  }

  // --------------------------------------------------
  // UPDATE ORDER STATUS
  // --------------------------------------------------

  async function updateOrderStatus(orderId, status) {
    try {
      const res = await fetch(`${API}/admin/orders/${orderId}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update order.");
      }

      await loadOrders();
    } catch (error) {
      console.error("Order update error:", error);
      alert(error.message || "Unable to update order.");
    }
  }

  // --------------------------------------------------
  // REFUND ORDER
  // --------------------------------------------------

  async function refundOrder(orderId) {
    const confirmed = window.confirm(
      "Are you sure you want to refund this order?"
    );

    if (!confirmed) return;

    try {
      const res = await fetch(`${API}/admin/orders/${orderId}/refund`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Refund failed.");
      }

      alert("Refund request completed.");

      await loadOrders();
    } catch (error) {
      console.error("Refund error:", error);
      alert(error.message || "Unable to process refund.");
    }
  }

  // --------------------------------------------------
  // HELPERS
  // --------------------------------------------------

  function parseImages(value) {
    if (Array.isArray(value)) {
      return value.filter(Boolean);
    }

    if (!value) {
      return [];
    }

    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.filter(Boolean);
      }
    } catch {
      // Ignore invalid JSON
    }

    return typeof value === "string" ? [value] : [];
  }

  function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString("en-IN");
  }

  function productImage(productItem) {
    const images = parseImages(productItem?.images);

    return images[0] || productItem?.image || "";
  }

  // --------------------------------------------------
  // LOGIN SCREEN
  // --------------------------------------------------

  if (checkingSession) {
    return (
      <div style={styles.centerPage}>
        <div style={styles.loadingText}>Checking admin session...</div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div style={styles.loginPage}>
        <form onSubmit={handleLogin} style={styles.loginCard}>
          <div style={styles.logoCircle}>HR</div>

          <h1 style={styles.loginTitle}>House of Rainbow</h1>

          <p style={styles.loginSubtitle}>Admin Panel</p>

          <input
            type="password"
            placeholder="Admin Password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            style={styles.input}
          />

          {loginError && (
            <div style={styles.errorBox}>
              {loginError}
            </div>
          )}

          <button
            type="submit"
            disabled={loggingIn}
            style={styles.primaryButton}
          >
            {loggingIn ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    );
  }

  // --------------------------------------------------
  // ADMIN PANEL
  // --------------------------------------------------

  return (
    <div style={styles.page}>
      {/* HEADER */}
      <header style={styles.header}>
        <div>
          <h1 style={styles.headerTitle}>House of Rainbow</h1>
          <p style={styles.headerSubtitle}>Admin Dashboard</p>
        </div>

        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </header>

      <main style={styles.container}>
        {/* ------------------------------------------ */}
        {/* PRODUCT FORM */}
        {/* ------------------------------------------ */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>
                {editingId ? "Edit Product" : "Add New Product"}
              </h2>

              <p style={styles.sectionSubtitle}>
                Add product details, category, stock and images.
              </p>
            </div>

            {editingId && (
              <button onClick={cancelEdit} style={styles.secondaryButton}>
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={saveProduct}>
            <div style={styles.formGrid}>
              {/* PRODUCT NAME */}
              <div style={styles.field}>
                <label style={styles.label}>Product Name</label>

                <input
                  type="text"
                  name="name"
                  value={product.name}
                  onChange={handleProductChange}
                  placeholder="Enter product name"
                  style={styles.input}
                />
              </div>

              {/* PRICE */}
              <div style={styles.field}>
                <label style={styles.label}>Price</label>

                <input
                  type="number"
                  name="price"
                  value={product.price}
                  onChange={handleProductChange}
                  placeholder="₹"
                  min="0"
                  step="0.01"
                  style={styles.input}
                />
              </div>

              {/* CATEGORY */}
              <div style={styles.field}>
                <label style={styles.label}>Category</label>

                <select
                  name="category"
                  value={product.category}
                  onChange={handleProductChange}
                  style={styles.input}
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              {/* STOCK */}
              <div style={styles.field}>
                <label style={styles.label}>Stock Quantity</label>

                <input
                  type="number"
                  name="stock_quantity"
                  value={product.stock_quantity}
                  onChange={handleProductChange}
                  min="0"
                  style={styles.input}
                />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div style={styles.field}>
              <label style={styles.label}>Description</label>

              <textarea
                name="description"
                value={product.description}
                onChange={handleProductChange}
                placeholder="Enter product description"
                rows={4}
                style={{
                  ...styles.input,
                  resize: "vertical",
                }}
              />
            </div>

            {/* FEATURED */}
            <label style={styles.checkboxRow}>
              <input
                type="checkbox"
                name="featured"
                checked={product.featured}
                onChange={handleProductChange}
              />

              <span>Show this product as Featured</span>
            </label>

            {/* IMAGE UPLOAD */}
            <div style={styles.imageSection}>
              <div style={styles.imageHeader}>
                <div>
                  <h3 style={styles.imageTitle}>Product Images</h3>

                  <p style={styles.imageHelp}>
                    Add images one by one. Maximum 4 images.
                  </p>
                </div>

                <span style={styles.imageCount}>
                  {imagePreviews.length}/4
                </span>
              </div>

              {/* PREVIEWS */}
              {imagePreviews.length > 0 && (
                <div style={styles.previewGrid}>
                  {imagePreviews.map((item, index) => (
                    <div key={`${item.url}-${index}`} style={styles.previewCard}>
                      <img
                        src={item.url}
                        alt={`Product ${index + 1}`}
                        style={styles.previewImage}
                      />

                      <div style={styles.previewFooter}>
                        <span style={styles.previewNumber}>
                          Image {index + 1}
                        </span>

                        <button
                          type="button"
                          onClick={() => {
                            if (item.type === "existing") {
                              setImagePreviews((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            } else {
                              const newIndex = imagePreviews
                                .slice(0, index + 1)
                                .filter((x) => x.type === "new").length - 1;

                              removeNewImage(newIndex);
                            }
                          }}
                          style={styles.removeButton}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ADD IMAGE BUTTON */}
              {imagePreviews.length < 4 && (
                <div style={styles.uploadBox}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple={false}
                    onChange={handleImageChange}
                    style={{ display: "none" }}
                    id="product-image-upload"
                  />

                  <label
                    htmlFor="product-image-upload"
                    style={styles.uploadButton}
                  >
                    + Add Image
                  </label>

                  <p style={styles.uploadText}>
                    Select one image at a time
                  </p>

                  <p style={styles.uploadSubText}>
                    JPG, PNG or WEBP • Maximum 5MB each
                  </p>
                </div>
              )}

              {imagePreviews.length === 4 && (
                <div style={styles.maxImagesBox}>
                  ✓ Maximum 4 images added
                </div>
              )}
            </div>

            {/* SAVE */}
            <div style={styles.formActions}>
              <button
                type="submit"
                disabled={savingProduct || uploadingImages}
                style={styles.primaryButton}
              >
                {savingProduct || uploadingImages
                  ? "Saving..."
                  : editingId
                  ? "Update Product"
                  : "Add Product"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={cancelEdit}
                  style={styles.secondaryButton}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </section>

        {/* ------------------------------------------ */}
        {/* PRODUCTS */}
        {/* ------------------------------------------ */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Products</h2>
              <p style={styles.sectionSubtitle}>
                Manage your House of Rainbow products.
              </p>
            </div>

            <button
              onClick={loadProducts}
              style={styles.secondaryButton}
            >
              Refresh
            </button>
          </div>

          {loadingProducts ? (
            <div style={styles.emptyState}>Loading products...</div>
          ) : products.length === 0 ? (
            <div style={styles.emptyState}>
              No products found.
            </div>
          ) : (
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Product</th>
                    <th style={styles.th}>Category</th>
                    <th style={styles.th}>Price</th>
                    <th style={styles.th}>Stock</th>
                    <th style={styles.th}>Featured</th>
                    <th style={styles.th}>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {products.map((item) => (
                    <tr key={item.id}>
                      <td style={styles.td}>
                        <div style={styles.productCell}>
                          {productImage(item) ? (
                            <img
                              src={productImage(item)}
                              alt={item.name}
                              style={styles.productThumb}
                            />
                          ) : (
                            <div style={styles.noImage}>
                              No Image
                            </div>
                          )}

                          <span>{item.name}</span>
                        </div>
                      </td>

                      <td style={styles.td}>
                        {item.category || "-"}
                      </td>

                      <td style={styles.td}>
                        ₹{Number(item.price || 0).toFixed(2)}
                      </td>

                      <td style={styles.td}>
                        <input
                          type="number"
                          min="0"
                          defaultValue={item.stock_quantity || 0}
                          onBlur={(e) =>
                            updateStock(item, e.target.value)
                          }
                          style={styles.stockInput}
                        />
                      </td>

                      <td style={styles.td}>
                        {item.featured ? "Yes" : "No"}
                      </td>

                      <td style={styles.td}>
                        <div style={styles.actionRow}>
                          <button
                            onClick={() => startEdit(item)}
                            style={styles.editButton}
                          >
                            Edit
                          </button>

                          <button
                            onClick={() => deleteProduct(item.id)}
                            style={styles.deleteButton}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* ------------------------------------------ */}
        {/* ORDERS */}
        {/* ------------------------------------------ */}

        <section style={styles.card}>
          <div style={styles.sectionHeader}>
            <div>
              <h2 style={styles.sectionTitle}>Orders</h2>

              <p style={styles.sectionSubtitle}>
                Manage customer orders and refunds.
              </p>
            </div>

            <button
              onClick={loadOrders}
              style={styles.secondaryButton}
            >
              Refresh
            </button>
          </div>

          {loadingOrders ? (
            <div style={styles.emptyState}>Loading orders...</div>
          ) : orders.length === 0 ? (
            <div style={styles.emptyState}>
              No orders found.
            </div>
          ) : (
            <div style={styles.ordersList}>
              {orders.map((order) => (
                <div key={order.id} style={styles.orderCard}>
                  <div style={styles.orderTop}>
                    <div>
                      <h3 style={styles.orderTitle}>
                        Order #{order.id}
                      </h3>

                      <p style={styles.orderDate}>
                        {formatDate(
                          order.created_at || order.createdAt
                        )}
                      </p>
                    </div>

                    <strong style={styles.orderAmount}>
                      ₹
                      {Number(
                        order.total_amount ||
                          order.amount ||
                          0
                      ).toFixed(2)}
                    </strong>
                  </div>

                  <div style={styles.orderDetails}>
                    {order.customer_name && (
                      <div>
                        <strong>Customer:</strong>{" "}
                        {order.customer_name}
                      </div>
                    )}

                    {order.customer_phone && (
                      <div>
                        <strong>Phone:</strong>{" "}
                        {order.customer_phone}
                      </div>
                    )}

                    {order.customer_email && (
                      <div>
                        <strong>Email:</strong>{" "}
                        {order.customer_email}
                      </div>
                    )}

                    {order.address && (
                      <div>
                        <strong>Address:</strong>{" "}
                        {order.address}
                      </div>
                    )}
                  </div>

                  <div style={styles.orderActions}>
                    <select
                      value={order.status || "pending"}
                      onChange={(e) =>
                        updateOrderStatus(
                          order.id,
                          e.target.value
                        )
                      }
                      style={styles.statusSelect}
                    >
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="refunded">Refunded</option>
                    </select>

                    {order.status !== "refunded" && (
                      <button
                        onClick={() => refundOrder(order.id)}
                        style={styles.refundButton}
                      >
                        Refund
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

// ==================================================
// STYLES
// ==================================================

const styles = {
  page: {
    minHeight: "100vh",
    background: "#faf7f2",
    color: "#292329",
  },

  centerPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#faf7f2",
  },

  loadingText: {
    fontSize: "16px",
    color: "#6f6370",
  },

  loginPage: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    background:
      "linear-gradient(135deg, #faf5ec 0%, #f0e8f8 100%)",
  },

  loginCard: {
    width: "100%",
    maxWidth: "420px",
    background: "#ffffff",
    borderRadius: "22px",
    padding: "40px",
    boxShadow: "0 20px 60px rgba(70, 50, 70, 0.12)",
    textAlign: "center",
  },

  logoCircle: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    margin: "0 auto 18px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eadcf3",
    color: "#6b4d76",
    fontWeight: "700",
    fontSize: "20px",
  },

  loginTitle: {
    margin: 0,
    fontSize: "27px",
    fontWeight: "700",
  },

  loginSubtitle: {
    margin: "8px 0 28px",
    color: "#7b6f7c",
  },

  header: {
    background: "#ffffff",
    borderBottom: "1px solid #eee5ed",
    padding: "18px 28px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
  },

  headerTitle: {
    margin: 0,
    fontSize: "24px",
  },

  headerSubtitle: {
    margin: "4px 0 0",
    color: "#807482",
    fontSize: "14px",
  },

  logoutButton: {
    border: "1px solid #ddd0df",
    background: "#ffffff",
    color: "#6d536f",
    padding: "10px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  container: {
    maxWidth: "1250px",
    margin: "0 auto",
    padding: "28px 18px 60px",
  },

  card: {
    background: "#ffffff",
    borderRadius: "18px",
    padding: "24px",
    marginBottom: "24px",
    boxShadow: "0 8px 30px rgba(70, 50, 70, 0.06)",
    border: "1px solid #eee7ef",
  },

  sectionHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "20px",
    marginBottom: "24px",
  },

  sectionTitle: {
    margin: 0,
    fontSize: "21px",
  },

  sectionSubtitle: {
    margin: "6px 0 0",
    color: "#827783",
    fontSize: "14px",
  },

  formGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "18px",
  },

  field: {
    marginBottom: "18px",
  },

  label: {
    display: "block",
    fontWeight: "600",
    marginBottom: "7px",
    fontSize: "14px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    border: "1px solid #ded5df",
    borderRadius: "10px",
    padding: "12px 13px",
    fontSize: "14px",
    outline: "none",
    background: "#fff",
  },

  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: "9px",
    marginBottom: "24px",
    fontSize: "14px",
    cursor: "pointer",
  },

  imageSection: {
    marginTop: "10px",
    padding: "20px",
    borderRadius: "14px",
    background: "#fbf8fc",
    border: "1px solid #eee4f0",
  },

  imageHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "15px",
    marginBottom: "18px",
  },

  imageTitle: {
    margin: 0,
    fontSize: "17px",
  },

  imageHelp: {
    margin: "5px 0 0",
    fontSize: "13px",
    color: "#817583",
  },

  imageCount: {
    minWidth: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "#eadcf3",
    color: "#674c72",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
  },

  previewGrid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fill, minmax(150px, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },

  previewCard: {
    background: "#ffffff",
    border: "1px solid #e4dce7",
    borderRadius: "12px",
    overflow: "hidden",
  },

  previewImage: {
    width: "100%",
    height: "150px",
    objectFit: "cover",
    display: "block",
  },

  previewFooter: {
    padding: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "8px",
  },

  previewNumber: {
    fontSize: "12px",
    color: "#706474",
  },

  removeButton: {
    border: "none",
    background: "#f4e7ed",
    color: "#8a4f62",
    padding: "6px 8px",
    borderRadius: "7px",
    fontSize: "11px",
    cursor: "pointer",
  },

  uploadBox: {
    border: "1.5px dashed #cbb9d1",
    borderRadius: "12px",
    padding: "25px",
    textAlign: "center",
    background: "#ffffff",
  },

  uploadButton: {
    display: "inline-block",
    background: "#6d5277",
    color: "#ffffff",
    padding: "11px 20px",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
  },

  uploadText: {
    margin: "12px 0 4px",
    fontSize: "13px",
    color: "#665b68",
  },

  uploadSubText: {
    margin: 0,
    fontSize: "11px",
    color: "#99909b",
  },

  maxImagesBox: {
    padding: "12px",
    borderRadius: "10px",
    background: "#edf7f0",
    color: "#42704d",
    textAlign: "center",
    fontSize: "13px",
    fontWeight: "600",
  },

  formActions: {
    display: "flex",
    gap: "10px",
    marginTop: "24px",
  },

  primaryButton: {
    border: "none",
    background: "#6d5277",
    color: "#ffffff",
    padding: "12px 22px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  secondaryButton: {
    border: "1px solid #d8cbdc",
    background: "#ffffff",
    color: "#624e68",
    padding: "11px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: "600",
  },

  errorBox: {
    background: "#f8e9ed",
    color: "#91485d",
    borderRadius: "9px",
    padding: "10px",
    marginBottom: "14px",
    fontSize: "13px",
  },

  emptyState: {
    padding: "35px",
    textAlign: "center",
    color: "#887d88",
  },

  tableWrapper: {
    overflowX: "auto",
  },

  table: {
    width: "100%",
    borderCollapse: "collapse",
    minWidth: "850px",
  },

  th: {
    textAlign: "left",
    padding: "13px",
    borderBottom: "1px solid #eee6ef",
    fontSize: "13px",
    color: "#756a76",
    whiteSpace: "nowrap",
  },

  td: {
    padding: "13px",
    borderBottom: "1px solid #f1ebf2",
    fontSize: "13px",
    verticalAlign: "middle",
  },

  productCell: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    minWidth: "210px",
    fontWeight: "600",
  },

  productThumb: {
    width: "50px",
    height: "50px",
    objectFit: "cover",
    borderRadius: "8px",
    border: "1px solid #e5dce7",
  },

  noImage: {
    width: "50px",
    height: "50px",
    borderRadius: "8px",
    background: "#f2edf3",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "9px",
    color: "#897d8b",
  },

  stockInput: {
    width: "75px",
    padding: "8px",
    border: "1px solid #ded5df",
    borderRadius: "8px",
  },

  actionRow: {
    display: "flex",
    gap: "7px",
  },

  editButton: {
    border: "none",
    background: "#eee4f4",
    color: "#654c70",
    padding: "8px 11px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  deleteButton: {
    border: "none",
    background: "#f7e8ec",
    color: "#914d60",
    padding: "8px 11px",
    borderRadius: "7px",
    cursor: "pointer",
    fontSize: "12px",
    fontWeight: "600",
  },

  ordersList: {
    display: "grid",
    gap: "15px",
  },

  orderCard: {
    border: "1px solid #ece5ed",
    borderRadius: "14px",
    padding: "18px",
    background: "#fff",
  },

  orderTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    marginBottom: "15px",
  },

  orderTitle: {
    margin: 0,
    fontSize: "16px",
  },

  orderDate: {
    margin: "5px 0 0",
    color: "#8b808c",
    fontSize: "12px",
  },

  orderAmount: {
    fontSize: "17px",
    color: "#654b6d",
  },

  orderDetails: {
    display: "grid",
    gap: "7px",
    color: "#5f5661",
    fontSize: "13px",
    marginBottom: "16px",
  },

  orderActions: {
    display: "flex",
    gap: "10px",
    alignItems: "center",
    flexWrap: "wrap",
  },

  statusSelect: {
    padding: "9px 11px",
    border: "1px solid #ded5df",
    borderRadius: "8px",
    background: "#ffffff",
  },

  refundButton: {
    border: "none",
    background: "#f3e5e9",
    color: "#8a4d5d",
    padding: "9px 15px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
  },
};