#!/usr/bin/env node
/**
 * Reset script for Tyche Terminal database
 * Clears all users so you can test the signup → plan selection flow
 * 
 * Usage: node scripts/reset-db.js
 */

const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tyche-terminal';

async function resetDatabase() {
    console.log('🔄 Connecting to MongoDB...');

    try {
        await mongoose.connect(MONGODB_URI);
        console.log('✅ Connected to MongoDB');

        // Drop the users collection
        const db = mongoose.connection.db;

        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);

        if (collectionNames.includes('users')) {
            await db.dropCollection('users');
            console.log('🗑️  Dropped users collection');
        } else {
            console.log('ℹ️  No users collection to drop');
        }

        console.log('\n✅ Database reset complete!');
        console.log('You can now sign up fresh and test the plan selection flow.\n');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        console.log('👋 Disconnected from MongoDB');
    }
}

resetDatabase();
