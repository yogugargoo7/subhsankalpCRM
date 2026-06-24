# Plot Availability Widget - Setup Instructions

This folder contains files to display real-time plot availability on your company website.

## 📁 Files Included

1. **plot-availability.html** - Standalone HTML page (no dependencies)
2. **PlotAvailability.jsx** - React component version
3. **Backend API** - PublicPlotsController.cs (already added to your project)

---

## 🚀 Quick Setup

### Option 1: Standalone HTML Page (Easiest)

1. **Update API URL** in `plot-availability.html`:
   ```javascript
   const API_URL = 'https://your-backend-url.azurewebsites.net/api/public/plots';
   ```
   Replace `your-backend-url` with your actual backend URL.

2. **Upload to your website**:
   - Upload `plot-availability.html` to your website hosting
   - Access it at: `https://yourwebsite.com/plot-availability.html`

3. **Embed in existing page** (optional):
   ```html
   <iframe 
     src="https://yourwebsite.com/plot-availability.html" 
     width="100%" 
     height="800px" 
     frameborder="0"
   ></iframe>
   ```

---

### Option 2: React Component

1. **Install in your React project**:
   ```bash
   # Copy PlotAvailability.jsx to your components folder
   cp PlotAvailability.jsx your-react-app/src/components/
   ```

2. **Update API URL** in the component:
   ```javascript
   const API_URL = 'https://your-backend-url.azurewebsites.net/api/public/plots';
   ```

3. **Use in your app**:
   ```jsx
   import PlotAvailability from './components/PlotAvailability';

   function App() {
     return <PlotAvailability />;
   }
   ```

---

## 🔌 API Endpoints Available

### 1. Get All Plots with Summary
```
GET /api/public/plots
```

**Response:**
```json
{
  "totalPlots": 100,
  "available": 45,
  "token": 10,
  "partPayment": 15,
  "booked": 20,
  "sold": 10,
  "plots": [
    {
      "id": 1,
      "plotVillaNo": "A-101",
      "plotSize": "100 sq yard",
      "siteName": "Golden City Phase 1",
      "status": "Available",
      "basicRate": 3000,
      "totalPrice": 300000,
      "hasCustomer": false
    }
  ]
}
```

### 2. Get Summary Only
```
GET /api/public/plots/summary
```

**Response:**
```json
{
  "totalPlots": 100,
  "available": 45,
  "token": 10,
  "partPayment": 15,
  "booked": 20,
  "sold": 10,
  "lastUpdated": "2025-11-29T10:30:00Z"
}
```

### 3. Get Plots Grouped by Site
```
GET /api/public/plots/by-site
```

**Response:**
```json
[
  {
    "siteName": "Golden City Phase 1",
    "totalPlots": 50,
    "available": 20,
    "token": 5,
    "partPayment": 10,
    "booked": 10,
    "sold": 5,
    "plots": [...]
  }
]
```

---

## 🎨 Customization

### Change Colors
Edit the CSS in `plot-availability.html`:

```css
/* Available plots - Green */
.plot-card.available {
    border-color: #10b981;
    background: #f0fdf4;
}

/* Token plots - Yellow */
.plot-card.token {
    border-color: #f59e0b;
    background: #fffbeb;
}
```

### Change Auto-Refresh Interval
```javascript
// Refresh every 30 seconds (default)
setInterval(fetchPlots, 30000);

// Change to 60 seconds
setInterval(fetchPlots, 60000);
```

### Add Your Logo
```html
<div class="header">
    <img src="your-logo.png" alt="Logo" style="height: 60px; margin-bottom: 20px;">
    <h1>🏘️ Plot Availability Status</h1>
</div>
```

---

## 🔒 Security Notes

1. **No Authentication Required** - This is a public API
2. **No Sensitive Data Exposed** - Customer names/contacts are hidden
3. **Read-Only** - Cannot modify plot data
4. **CORS Enabled** - Can be called from any website

---

## 📱 Mobile Responsive

Both versions are fully responsive and work on:
- ✅ Desktop computers
- ✅ Tablets
- ✅ Mobile phones

---

## 🐛 Troubleshooting

### Issue: "Unable to load plots data"

**Solution:**
1. Check if backend API is running
2. Verify API URL is correct
3. Check browser console for CORS errors
4. Ensure PublicPlotsController is deployed

### Issue: CORS Error

**Solution:**
Add your website domain to CORS policy in `Program.cs`:
```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowReactApp", policy =>
    {
        policy.WithOrigins(
            "http://localhost:3000",
            "https://yourwebsite.com"  // Add your domain
        )
        .AllowAnyMethod()
        .AllowAnyHeader();
    });
});
```

### Issue: Data not updating

**Solution:**
- Check if auto-refresh is working (every 30 seconds)
- Manually refresh the page
- Check backend database connection

---

## 📞 Support

For issues or questions, contact your development team.

---

## 🎯 Features

✅ Real-time plot availability
✅ Filter by status (Available, Token, Booked, etc.)
✅ Auto-refresh every 30 seconds
✅ Mobile responsive design
✅ No authentication required
✅ Easy to embed anywhere
✅ Beautiful modern UI
✅ Summary statistics
✅ Site-wise grouping available

---

## 📊 Example Usage Scenarios

1. **Company Website** - Show available plots to potential customers
2. **Sales Office Display** - Large screen showing real-time availability
3. **Mobile App** - Embed in your mobile application
4. **Email Campaigns** - Link to live availability page
5. **Social Media** - Share link to current availability

---

**Last Updated:** November 2025
