import { PrismaClient } from '@prisma/client';

/**
 * Worker Database Connection
 * Uses PostgreSQL via Prisma (same as API service)
 * Connects to the centralized PostgreSQL database
 */

let prisma: PrismaClient | null = null;

/**
 * Initialize database connection using Prisma
 */
export const initDatabase = async (): Promise<PrismaClient> => {
	if (prisma) {
		return prisma;
	}

	try {
		console.log('📊 [Worker] Connecting to PostgreSQL database via Prisma...');
		
		// Initialize Prisma client
		prisma = new PrismaClient({
			log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn'] : ['warn'],
		});

		// Connect to database
		await prisma.$connect();
		
		console.log('✅ [Worker] Database connected successfully (PostgreSQL via Prisma)');
		return prisma;
	} catch (error) {
		console.error('❌ [Worker] Failed to initialize database:', error);
		throw error;
	}
};

/**
 * Get existing database connection (initializes if needed)
 */
export const getDatabase = async (): Promise<PrismaClient> => {
	if (!prisma) {
		return await initDatabase();
	}
	return prisma;
};

/**
 * Close database connection
 */
export const closeDatabase = async (): Promise<void> => {
	if (prisma) {
		await prisma.$disconnect();
		prisma = null;
		console.log('📊 [Worker] Database connection closed');
	}
};
