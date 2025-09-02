import { Component, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { RippleModule } from 'primeng/ripple';

interface Product {
  id: number;
  name: string;
  category: string;
  price: number;
  status: string;
}

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    CardModule,
    InputTextModule,
    ToastModule,
    TableModule,
    TagModule,
    DialogModule,
    RippleModule
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 p-8">
      <!-- Toast Messages -->
      <p-toast></p-toast>

      <!-- Header with Tailwind -->
      <header class="text-center mb-8">
        <h1 class="text-4xl font-bold text-gray-800 mb-2">
          PrimeNG + Tailwind CSS Demo
        </h1>
        <p class="text-gray-600">
          Combining the power of PrimeNG components with Tailwind utility classes
        </p>
      </header>

      <!-- Cards Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <!-- Tailwind Card -->
        <div class="bg-white rounded-lg shadow-lg p-6 transform hover:scale-105 transition-transform duration-300">
          <h2 class="text-2xl font-semibold text-blue-600 mb-4">
            Tailwind CSS Card
          </h2>
          <p class="text-gray-700 mb-4">
            This card is styled entirely with Tailwind CSS utility classes.
          </p>
          <button 
            class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-full transition-colors duration-200"
            (click)="showTailwindMessage()">
            Tailwind Button
          </button>
        </div>

        <!-- PrimeNG Card -->
        <p-card header="PrimeNG Card" subheader="Component-based styling">
          <p class="mb-4">
            This card uses PrimeNG's Card component with built-in theming.
          </p>
          <p-button 
            label="PrimeNG Button" 
            icon="pi pi-check" 
            (onClick)="showPrimeMessage()"
            pRipple>
          </p-button>
        </p-card>
      </div>

      <!-- Interactive Section -->
      <div class="bg-white rounded-lg shadow-xl p-8 mb-8">
        <h2 class="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <i class="pi pi-shopping-cart mr-2 text-purple-600"></i>
          Product Management
        </h2>

        <!-- Input Section with Mixed Styling -->
        <div class="flex gap-4 mb-6">
          <div class="flex-1">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Product Name (PrimeNG Input)
            </label>
            <input 
              type="text" 
              pInputText 
              [(ngModel)]="productName"
              class="w-full"
              placeholder="Enter product name">
          </div>
          <div class="flex items-end">
            <p-button 
              label="Add Product" 
              icon="pi pi-plus"
              [disabled]="!productName"
              (onClick)="addProduct()"
              styleClass="px-6">
            </p-button>
          </div>
        </div>

        <!-- PrimeNG Table with Tailwind enhancements -->
        <p-table 
          [value]="products()" 
          [tableStyle]="{'min-width': '50rem'}"
          styleClass="shadow-sm">
          <ng-template pTemplate="header">
            <tr>
              <th class="text-left">ID</th>
              <th class="text-left">Name</th>
              <th class="text-left">Category</th>
              <th class="text-left">Price</th>
              <th class="text-left">Status</th>
              <th class="text-center">Actions</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-product>
            <tr class="hover:bg-gray-50 transition-colors">
              <td>{{ product.id }}</td>
              <td class="font-medium">{{ product.name }}</td>
              <td>{{ product.category }}</td>
              <td class="font-mono">\${{ product.price }}</td>
              <td>
                <p-tag 
                  [value]="product.status" 
                  [severity]="getStatusSeverity(product.status)">
                </p-tag>
              </td>
              <td class="text-center">
                <button 
                  class="text-blue-600 hover:text-blue-800 mr-2"
                  (click)="editProduct(product)">
                  <i class="pi pi-pencil"></i>
                </button>
                <button 
                  class="text-red-600 hover:text-red-800"
                  (click)="deleteProduct(product)">
                  <i class="pi pi-trash"></i>
                </button>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>

      <!-- Dialog Example -->
      <p-dialog 
        [(visible)]="dialogVisible" 
        [modal]="true" 
        [style]="{width: '50vw'}"
        header="Product Details"
        [draggable]="false"
        [resizable]="false">
        <div class="p-4">
          <p class="text-gray-700 mb-4">
            This is a PrimeNG Dialog component with Tailwind content styling.
          </p>
          <div class="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p class="text-blue-700">
              <i class="pi pi-info-circle mr-2"></i>
              You can mix and match both libraries seamlessly!
            </p>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button 
            label="Close" 
            icon="pi pi-times" 
            (onClick)="dialogVisible = false"
            severity="secondary">
          </p-button>
        </ng-template>
      </p-dialog>

      <!-- Feature Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-6 shadow-lg">
          <i class="pi pi-palette text-3xl mb-3"></i>
          <h3 class="text-xl font-semibold mb-2">Rich Components</h3>
          <p class="text-blue-100">
            PrimeNG provides 80+ UI components out of the box
          </p>
        </div>
        <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-6 shadow-lg">
          <i class="pi pi-bolt text-3xl mb-3"></i>
          <h3 class="text-xl font-semibold mb-2">Utility-First</h3>
          <p class="text-purple-100">
            Tailwind CSS enables rapid UI development with utilities
          </p>
        </div>
        <div class="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-6 shadow-lg">
          <i class="pi pi-check-circle text-3xl mb-3"></i>
          <h3 class="text-xl font-semibold mb-2">Best of Both</h3>
          <p class="text-green-100">
            Combine both for maximum flexibility and productivity
          </p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host {
      display: block;
    }
  `]
})
export class DemoComponent {
  products = signal<Product[]>([
    { id: 1, name: 'Laptop', category: 'Electronics', price: 999, status: 'In Stock' },
    { id: 2, name: 'Phone', category: 'Electronics', price: 699, status: 'In Stock' },
    { id: 3, name: 'Tablet', category: 'Electronics', price: 399, status: 'Low Stock' },
    { id: 4, name: 'Monitor', category: 'Electronics', price: 299, status: 'Out of Stock' },
  ]);

  productName = '';
  dialogVisible = false;
  private nextId = 5;

  constructor(private messageService: MessageService) {}

  showTailwindMessage() {
    this.messageService.add({
      severity: 'info',
      summary: 'Tailwind CSS',
      detail: 'You clicked a Tailwind-styled button!',
      life: 3000
    });
  }

  showPrimeMessage() {
    this.messageService.add({
      severity: 'success',
      summary: 'PrimeNG',
      detail: 'You clicked a PrimeNG button!',
      life: 3000
    });
  }

  addProduct() {
    const name = this.productName;
    if (name) {
      const newProduct: Product = {
        id: this.nextId++,
        name: name,
        category: 'New Category',
        price: Math.floor(Math.random() * 1000),
        status: 'In Stock'
      };
      this.products.update(products => [...products, newProduct]);
      this.productName = '';
      this.messageService.add({
        severity: 'success',
        summary: 'Product Added',
        detail: `${name} has been added successfully!`,
        life: 3000
      });
    }
  }

  editProduct(product: Product) {
    this.dialogVisible = true;
    this.messageService.add({
      severity: 'info',
      summary: 'Edit Mode',
      detail: `Editing ${product.name}`,
      life: 3000
    });
  }

  deleteProduct(product: Product) {
    this.products.update(products => products.filter(p => p.id !== product.id));
    this.messageService.add({
      severity: 'warn',
      summary: 'Product Deleted',
      detail: `${product.name} has been removed`,
      life: 3000
    });
  }

  getStatusSeverity(status: string): 'success' | 'secondary' | 'info' | 'warning' | 'danger' | 'contrast' | undefined {
    switch (status) {
      case 'In Stock':
        return 'success';
      case 'Low Stock':
        return 'warning';
      case 'Out of Stock':
        return 'danger';
      default:
        return undefined;
    }
  }
}