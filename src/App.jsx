import { useState, useEffect } from 'react'
    import { db } from './lib/database.js'

    function App() {
      const [products, setProducts] = useState([])
      const [cart, setCart] = useState([])
      const [isCartOpen, setIsCartOpen] = useState(false)
      const [isCheckout, setIsCheckout] = useState(false)
      const [orderComplete, setOrderComplete] = useState(false)
      const [loading, setLoading] = useState(true)
      const [error, setError] = useState(null)

      // Fetch products from database
      useEffect(() => {
        fetchProducts()
      }, [])

      const fetchProducts = async () => {
        try {
          setLoading(true)
          const { data, error } = await db.from('products').select('*')
          if (error) throw error
          setProducts(data || [])
        } catch (err) {
          setError('Failed to load products')
          console.error('Error fetching products:', err)
        } finally {
          setLoading(false)
        }
      }

      const addToCart = (product) => {
        setCart(prev => {
          const existing = prev.find(item => item.id === product.id)
          if (existing) {
            return prev.map(item =>
              item.id === product.id
                ? { ...item, quantity: item.quantity + 1 }
                : item
            )
          }
          return [...prev, { ...product, quantity: 1 }]
        })
      }

      const removeFromCart = (productId) => {
        setCart(prev => prev.filter(item => item.id !== productId))
      }

      const updateQuantity = (productId, delta) => {
        setCart(prev => prev.map(item => {
          if (item.id === productId) {
            const newQuantity = Math.max(1, item.quantity + delta)
            return { ...item, quantity: newQuantity }
          }
          return item
        }))
      }

      const getCartTotal = () => {
        return cart.reduce((total, item) => total + item.price * item.quantity, 0)
      }

      const getCartCount = () => {
        return cart.reduce((count, item) => count + item.quantity, 0)
      }

      const handleCheckout = async (e) => {
        e.preventDefault()
        
        try {
          // Create order
          const orderData = {
            customer_name: e.target.fullName.value,
            customer_email: e.target.email.value,
            customer_address: e.target.address.value,
            total_amount: getCartTotal(),
            status: 'completed'
          }

          const { data: order, error: orderError } = await db.from('orders').insert(orderData)
          if (orderError) throw orderError

          // Create order items
          const orderItems = cart.map(item => ({
            order_id: order[0].id,
            product_id: item.id,
            product_name: item.name,
            quantity: item.quantity,
            price: item.price
          }))

          for (const item of orderItems) {
            const { error: itemError } = await db.from('order_items').insert(item)
            if (itemError) throw itemError
          }

          // Update product stock
          for (const item of cart) {
            const { data: product } = await db.from('products').select('stock').eq('id', item.id).single()
            if (product) {
              await db.from('products').update({ stock: product.stock - item.quantity }).eq('id', item.id)
            }
          }

          setOrderComplete(true)
          setCart([])
        } catch (err) {
          console.error('Checkout error:', err)
          alert('Failed to place order. Please try again.')
        }
      }

      const closeModal = () => {
        setIsCartOpen(false)
        setIsCheckout(false)
        setOrderComplete(false)
      }

      const scrollToProducts = () => {
        document.getElementById('products').scrollIntoView({ behavior: 'smooth' })
      }

      if (loading) {
        return (
          <div className="loading-screen">
            <div className="spinner"></div>
            <p>Loading products...</p>
          </div>
        )
      }

      if (error) {
        return (
          <div className="error-screen">
            <p>{error}</p>
            <button onClick={fetchProducts}>Retry</button>
          </div>
        )
      }

      return (
        <div className="app">
          <header>
            <div className="container header-content">
              <div className="logo">🛒 SimpleShop</div>
              <button className="cart-btn" onClick={() => setIsCartOpen(true)}>
                Cart {getCartCount() > 0 && <span className="cart-count">{getCartCount()}</span>}
              </button>
            </div>
          </header>

          {/* Hero Section */}
          <section className="hero">
            <div className="hero-overlay"></div>
            <div className="hero-content">
              <h1 className="hero-title">Discover Amazing Products</h1>
              <p className="hero-subtitle">
                Shop the latest tech gadgets and accessories at unbeatable prices. 
                Quality products, fast shipping, and excellent customer service.
              </p>
              <button className="hero-cta" onClick={scrollToProducts}>
                Shop Now
              </button>
            </div>
            <div className="hero-stats">
              <div className="stat-item">
                <span className="stat-number">10K+</span>
                <span className="stat-label">Happy Customers</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">{products.length}+</span>
                <span className="stat-label">Products</span>
              </div>
              <div className="stat-item">
                <span className="stat-number">24/7</span>
                <span className="stat-label">Support</span>
              </div>
            </div>
          </section>

          {/* Products Section */}
          <section className="products-section" id="products">
            <div className="container">
              <div className="section-header">
                <h2 className="section-title">Featured Products</h2>
                <p className="section-subtitle">Handpicked just for you</p>
              </div>
              <div className="products-grid">
                {products.map(product => (
                  <div key={product.id} className="product-card">
                    <div className="product-image-wrapper">
                      <img src={product.image} alt={product.name} className="product-image" />
                      {product.stock < 20 && <div className="product-badge low-stock">Low Stock</div>}
                      {product.stock === 0 && <div className="product-badge out-of-stock">Out of Stock</div>}
                      {!product.stock < 20 && product.stock > 0 && <div className="product-badge">New</div>}
                    </div>
                    <div className="product-info">
                      <h3 className="product-name">{product.name}</h3>
                      <p className="product-description">{product.description}</p>
                      <div className="product-meta">
                        <span className="product-category">{product.category}</span>
                        <span className="product-stock">{product.stock} in stock</span>
                      </div>
                      <div className="product-footer">
                        <div className="product-price">${parseFloat(product.price).toFixed(2)}</div>
                        <button 
                          className="add-to-cart-btn" 
                          onClick={() => addToCart(product)}
                          disabled={product.stock === 0}
                        >
                          {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Section */}
          <section className="features-section">
            <div className="container">
              <div className="features-grid">
                <div className="feature-card">
                  <div className="feature-icon">🚚</div>
                  <h3 className="feature-title">Free Shipping</h3>
                  <p className="feature-desc">Free shipping on all orders over $50</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">🔒</div>
                  <h3 className="feature-title">Secure Payment</h3>
                  <p className="feature-desc">100% secure payment processing</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">↩️</div>
                  <h3 className="feature-title">Easy Returns</h3>
                  <p className="feature-desc">30-day money back guarantee</p>
                </div>
                <div className="feature-card">
                  <div className="feature-icon">💬</div>
                  <h3 className="feature-title">24/7 Support</h3>
                  <p className="feature-desc">Round the clock customer support</p>
                </div>
              </div>
            </div>
          </section>

          {/* Footer */}
          <footer className="footer">
            <div className="container">
              <div className="footer-grid">
                <div className="footer-brand">
                  <div className="footer-logo">🛒 SimpleShop</div>
                  <p className="footer-desc">
                    Your one-stop destination for quality tech products. 
                    We bring you the best gadgets at the best prices.
                  </p>
                  <div className="social-links">
                    <a href="#" className="social-link">📘</a>
                    <a href="#" className="social-link">🐦</a>
                    <a href="#" className="social-link">📸</a>
                    <a href="#" className="social-link">💼</a>
                  </div>
                </div>
                
                <div className="footer-links">
                  <h4 className="footer-title">Quick Links</h4>
                  <ul>
                    <li><a href="#">Home</a></li>
                    <li><a href="#">Products</a></li>
                    <li><a href="#">About Us</a></li>
                    <li><a href="#">Contact</a></li>
                    <li><a href="#">Blog</a></li>
                  </ul>
                </div>
                
                <div className="footer-links">
                  <h4 className="footer-title">Customer Service</h4>
                  <ul>
                    <li><a href="#">My Account</a></li>
                    <li><a href="#">Order Tracking</a></li>
                    <li><a href="#">Wishlist</a></li>
                    <li><a href="#">Returns</a></li>
                    <li><a href="#">FAQ</a></li>
                  </ul>
                </div>
                
                <div className="footer-contact">
                  <h4 className="footer-title">Contact Us</h4>
                  <p className="contact-item">📍 123 Commerce St, City, State 12345</p>
                  <p className="contact-item">📞 +1 (555) 123-4567</p>
                  <p className="contact-item">✉️ support@simpleshop.com</p>
                  
                  <div className="newsletter">
                    <h5>Subscribe to our newsletter</h5>
                    <div className="newsletter-form">
                      <input type="email" placeholder="Your email" />
                      <button>Subscribe</button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="footer-bottom">
                <p>&copy; 2024 SimpleShop. All rights reserved.</p>
                <div className="footer-payments">
                  <span>💳 Visa</span>
                  <span>💳 MasterCard</span>
                  <span>💳 Amex</span>
                  <span>💳 PayPal</span>
                </div>
              </div>
            </div>
          </footer>

          {isCartOpen && (
            <div className="modal-overlay" onClick={closeModal}>
              <div className="modal" onClick={e => e.stopPropagation()}>
                {!isCheckout && !orderComplete && (
                  <>
                    <div className="modal-header">
                      <h2 className="modal-title">Shopping Cart</h2>
                      <button className="close-btn" onClick={closeModal}>×</button>
                    </div>
                    {cart.length === 0 ? (
                      <div className="cart-empty">
                        <p>Your cart is empty</p>
                      </div>
                    ) : (
                      <>
                        {cart.map(item => (
                          <div key={item.id} className="cart-item">
                            <img src={item.image} alt={item.name} className="cart-item-image" />
                            <div className="cart-item-info">
                              <div className="cart-item-name">{item.name}</div>
                              <div className="cart-item-price">${parseFloat(item.price).toFixed(2)}</div>
                              <div className="cart-item-quantity">
                                <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}>-</button>
                                <span>{item.quantity}</span>
                                <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}>+</button>
                              </div>
                            </div>
                            <button className="remove-btn" onClick={() => removeFromCart(item.id)}>Remove</button>
                          </div>
                        ))}
                        <div className="cart-footer">
                          <div className="cart-total">Total: ${getCartTotal().toFixed(2)}</div>
                          <button className="checkout-btn" onClick={() => setIsCheckout(true)}>
                            Proceed to Checkout
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}

                {isCheckout && !orderComplete && (
                  <>
                    <div className="modal-header">
                      <h2 className="modal-title">Checkout</h2>
                      <button className="close-btn" onClick={closeModal}>×</button>
                    </div>
                    <div className="order-summary">
                      <h3>Order Summary</h3>
                      {cart.map(item => (
                        <div key={item.id} className="summary-item">
                          <span>{item.name} x {item.quantity}</span>
                          <span>${(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="summary-item" style={{ borderTop: '1px solid #ddd', marginTop: '10px', paddingTop: '10px', fontWeight: 'bold' }}>
                        <span>Total</span>
                        <span>${getCartTotal().toFixed(2)}</span>
                      </div>
                    </div>
                    <form className="checkout-form" onSubmit={handleCheckout}>
                      <div className="form-group">
                        <label>Full Name</label>
                        <input type="text" name="fullName" required placeholder="John Doe" />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input type="email" name="email" required placeholder="john@example.com" />
                      </div>
                      <div className="form-group">
                        <label>Address</label>
                        <input type="text" name="address" required placeholder="123 Main St" />
                      </div>
                      <div className="form-group">
                        <label>Card Number</label>
                        <input type="text" name="cardNumber" required placeholder="1234 5678 9012 3456" />
                      </div>
                      <button type="submit" className="checkout-btn">Place Order</button>
                    </form>
                  </>
                )}

                {orderComplete && (
                  <div className="success-message">
                    <h2>✅ Order Placed Successfully!</h2>
                    <p>Thank you for your purchase. Your order has been confirmed.</p>
                    <button className="continue-shopping" onClick={closeModal}>
                      Continue Shopping
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )
    }

    export default App
