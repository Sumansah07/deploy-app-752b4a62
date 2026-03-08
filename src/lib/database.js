// Local Storage Database Client - Works in WebContainer without proxy
    class DatabaseClient {
      constructor(projectId) {
        this.projectId = projectId;
        this.storageKey = `db_${projectId}`;
        this.initDatabase();
      }

      // Initialize with sample data if empty
      initDatabase() {
        if (!localStorage.getItem(this.storageKey)) {
          const initialData = {
            products: [
              {
                id: '1',
                name: 'Wireless Headphones',
                description: 'High-quality wireless headphones with noise cancellation',
                price: 79.99,
                image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400',
                category: 'Electronics',
                stock: 100,
                created_at: new Date().toISOString()
              },
              {
                id: '2',
                name: 'Smart Watch',
                description: 'Track your fitness and stay connected with this smart watch',
                price: 199.99,
                image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400',
                category: 'Electronics',
                stock: 50,
                created_at: new Date().toISOString()
              },
              {
                id: '3',
                name: 'Laptop Backpack',
                description: 'Durable and stylish backpack for your laptop and accessories',
                price: 49.99,
                image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400',
                category: 'Accessories',
                stock: 75,
                created_at: new Date().toISOString()
              },
              {
                id: '4',
                name: 'Bluetooth Speaker',
                description: 'Portable speaker with amazing sound quality',
                price: 39.99,
                image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=400',
                category: 'Electronics',
                stock: 120,
                created_at: new Date().toISOString()
              },
              {
                id: '5',
                name: 'Phone Case',
                description: 'Protective case for your smartphone',
                price: 19.99,
                image: 'https://images.unsplash.com/photo-1603313011101-320f26a4f6f6?w=400',
                category: 'Accessories',
                stock: 200,
                created_at: new Date().toISOString()
              },
              {
                id: '6',
                name: 'USB-C Hub',
                description: 'Multi-port hub for all your connectivity needs',
                price: 59.99,
                image: 'https://images.unsplash.com/photo-1625723044792-44de16ccb4e9?w=400',
                category: 'Electronics',
                stock: 80,
                created_at: new Date().toISOString()
              }
            ],
            orders: [],
            order_items: []
          };
          localStorage.setItem(this.storageKey, JSON.stringify(initialData));
        }
      }

      // Get all data
      getData() {
        const data = localStorage.getItem(this.storageKey);
        return data ? JSON.parse(data) : { products: [], orders: [], order_items: [] };
      }

      // Save all data
      saveData(data) {
        localStorage.setItem(this.storageKey, JSON.stringify(data));
      }

      // Generate UUID
      generateId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      }

      from(table) {
        const self = this;
        return {
          select: function(columns = '*') {
            const filters = {};
            let limitValue = undefined;
            const builder = {
              eq: function(column, value) { 
                filters.eq = { column, value }; 
                return builder; 
              },
              limit: function(count) { 
                limitValue = count; 
                return builder; 
              },
              single: async function() {
                return new Promise((resolve) => {
                  setTimeout(() => {
                    const data = self.getData();
                    let results = data[table] || [];
                    
                    if (filters.eq) {
                      results = results.filter(item => item[filters.eq.column] === filters.eq.value);
                    }
                    
                    const result = results[0] || null;
                    resolve({ data: result, error: null });
                  }, 100);
                });
              }
            };
            
            builder.then = async function(resolve) {
              setTimeout(() => {
                const data = self.getData();
                let results = data[table] || [];
                
                if (filters.eq) {
                  results = results.filter(item => item[filters.eq.column] === filters.eq.value);
                }
                
                if (limitValue) {
                  results = results.slice(0, limitValue);
                }
                
                resolve({ data: results, error: null });
              }, 100);
            };
            
            return builder;
          },
          
          insert: async function(data) {
            return new Promise((resolve) => {
              setTimeout(() => {
                const db = self.getData();
                if (!db[table]) db[table] = [];
                
                const newItem = {
                  id: self.generateId(),
                  ...data,
                  created_at: new Date().toISOString()
                };
                
                db[table].push(newItem);
                self.saveData(db);
                
                resolve({ data: [newItem], error: null });
              }, 100);
            });
          },
          
          update: function(data) {
            return {
              eq: async function(column, value) {
                return new Promise((resolve) => {
                  setTimeout(() => {
                    const db = self.getData();
                    if (!db[table]) {
                      resolve({ data: [], error: null });
                      return;
                    }
                    
                    db[table] = db[table].map(item => {
                      if (item[column] === value) {
                        return { ...item, ...data };
                      }
                      return item;
                    });
                    
                    self.saveData(db);
                    resolve({ data: [], error: null });
                  }, 100);
                });
              }
            };
          },
          
          delete: function() {
            return {
              eq: async function(column, value) {
                return new Promise((resolve) => {
                  setTimeout(() => {
                    const db = self.getData();
                    if (!db[table]) {
                      resolve({ data: [], error: null });
                      return;
                    }
                    
                    db[table] = db[table].filter(item => item[column] !== value);
                    self.saveData(db);
                    
                    resolve({ data: [], error: null });
                  }, 100);
                });
              }
            };
          }
        };
      }
    }

    export const db = new DatabaseClient('9b5c13e0-72ee-4355-b94d-54f80755b45f');
