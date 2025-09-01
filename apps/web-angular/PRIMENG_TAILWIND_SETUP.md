# PrimeNG + Tailwind CSS v4 Integration Guide

## 🎯 Configuration Overview

This Angular application successfully integrates **PrimeNG 20** with **Tailwind CSS v4**, providing the best of both worlds:
- Rich, accessible UI components from PrimeNG
- Utility-first styling with Tailwind CSS

## 📋 Key Configuration Files

### 1. **styles.scss** - Main Styles Entry Point
```scss
/* Tailwind CSS v4 import - must come first */
@import "tailwindcss";

/* PrimeIcons for icon support */
@import "primeicons/primeicons.css";

/* Theme configuration using CSS custom properties */
@theme {
  --font-family-sans: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}

/* Integration styles in @layer base */
```

### 2. **tailwind.config.ts** - Tailwind Configuration
- Content paths configured for Angular templates
- Custom color palette that complements PrimeNG
- Optional prefix configuration to avoid conflicts

### 3. **app.config.ts** - PrimeNG Theme Configuration
- Custom Tailwind-compatible preset based on Aura theme
- Semantic color tokens aligned with Tailwind's color system
- Ripple effects enabled for better UX

### 4. **postcss.config.js** - PostCSS Setup
- Uses `@tailwindcss/postcss` plugin for Tailwind v4
- Autoprefixer handled automatically by Tailwind

## 🚀 Testing the Integration

Run the development server:
```bash
cd apps/web-angular
bun run start
# or
npm start
```

## ✅ What's Working

1. **Tailwind Utilities**: All Tailwind utility classes work as expected
2. **PrimeNG Components**: Components render with proper theming
3. **Mixed Styling**: Can use both Tailwind classes and PrimeNG components together
4. **Responsive Design**: Tailwind's responsive utilities work with PrimeNG components
5. **Custom Theme**: Semantic tokens ensure consistent colors across both libraries

## 🎨 Best Practices

### 1. Component Styling Priority
```html
<!-- PrimeNG component with Tailwind utilities -->
<p-button 
  label="Action" 
  styleClass="px-6 py-3 rounded-full">
</p-button>
```

### 2. Table Styling
```html
<!-- PrimeNG Table with Tailwind row hover -->
<p-table [value]="data">
  <ng-template pTemplate="body" let-item>
    <tr class="hover:bg-gray-50 transition-colors">
      <td>{{ item.name }}</td>
    </tr>
  </ng-template>
</p-table>
```

### 3. Form Controls
```html
<!-- PrimeNG input with Tailwind container -->
<div class="flex gap-4">
  <input pInputText class="flex-1" />
  <p-button label="Submit"></p-button>
</div>
```

## 🔧 Troubleshooting

### Issue: Styles not applying
**Solution**: Ensure the development server was restarted after configuration changes

### Issue: Class conflicts
**Solution**: Consider using Tailwind's prefix option in `tailwind.config.ts`:
```typescript
export default {
  prefix: 'tw-',
  // ... rest of config
}
```

### Issue: Missing PrimeNG styles
**Solution**: The theme is now configured in `app.config.ts` using the custom TailwindPreset

## 📚 Resources

- [Tailwind CSS v4 Documentation](https://tailwindcss.com/docs)
- [PrimeNG Documentation](https://primeng.org/)
- [Angular 20 Documentation](https://angular.dev/)

## 🎯 Next Steps

1. **Dark Mode**: Add dark mode support using Tailwind's dark variant
2. **Custom Components**: Create shared components that leverage both libraries
3. **Performance**: Consider using PurgeCSS for production builds
4. **Testing**: Add unit tests for mixed-styling scenarios

---

*Configuration completed and tested with:*
- Angular 20.2
- PrimeNG 20.0.1
- Tailwind CSS 4.1.12
- @primeuix/themes 1.2.3