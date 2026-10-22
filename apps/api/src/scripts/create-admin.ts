import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { User } from '../models/User.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from apps/api/.env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const ATLAS_DEFAULT_URI = 'mongodb+srv://designshailajaias_db_user:fRLqC5Eho0td8Jwh@cluster0.sf2j9z.mongodb.net/shailaja-ias?retryWrites=true&w=majority';

// Parse arguments (filter out node/script args and any flags)
const rawArgs = process.argv.slice(2);
const isLocal = rawArgs.includes('--local');
const args = rawArgs.filter(arg => !arg.startsWith('--'));

const email = args[0];
const password = args[1];
const name = args[2] || 'Admin User';

if (!email || !password) {
    console.log('\n❌ Error: Email and password are required.');
    console.log('\nUsage:');
    console.log('  pnpm create-admin <email> <password> "[Name]"');
    console.log('  pnpm create-admin <email> <password> "[Name]" --local   (targets local DB)\n');
    console.log('Example:');
    console.log('  pnpm create-admin admin@shailajaias.com MySecurePass2026 "Super Admin"\n');
    process.exit(1);
}

if (password.length < 6) {
    console.log('\n❌ Error: Password must be at least 6 characters long.\n');
    process.exit(1);
}

const cleanEmail = email.toLowerCase().trim();

// Target Atlas by default unless --local is specified
const targetUri = isLocal
    ? (process.env.MONGO_URI || 'mongodb://localhost:27017/shailaja-ias')
    : (process.env.MONGODB_URI || ATLAS_DEFAULT_URI);

const targetType = targetUri.includes('mongodb+srv://') ? '☁️  MongoDB Atlas (Cloud)' : '💻 Local MongoDB';

async function main() {
    try {
        console.log(`\nConnecting to ${targetType}...`);
        await mongoose.connect(targetUri);
        console.log('✅ Connected successfully.');

        let user = await User.findOne({ email: cleanEmail });

        if (user) {
            console.log(`Found existing user with email: ${cleanEmail}. Updating to Admin role and resetting password...`);
            user.name = name;
            user.role = 'admin';
            user.status = 'active';
            user.authProvider = 'local';
            user.password = password; // Pre-save hook will hash with bcrypt
            user.tokenVersion = (user.tokenVersion || 0) + 1;
            await user.save();
            console.log(`\n🎉 Admin user [${cleanEmail}] updated successfully!`);
        } else {
            console.log(`Creating new Admin user for ${cleanEmail}...`);
            user = new User({
                email: cleanEmail,
                password: password, // Pre-save hook will hash with bcrypt
                name: name,
                role: 'admin',
                status: 'active',
                authProvider: 'local',
                tokenVersion: 0,
            });
            await user.save();
            console.log(`\n🎉 New Admin user [${cleanEmail}] created successfully!`);
        }

        console.log('--------------------------------------------------');
        console.log(`Email:    ${cleanEmail}`);
        console.log(`Role:     admin`);
        console.log(`Name:     ${name}`);
        console.log(`Database: ${targetType}`);
        console.log('--------------------------------------------------\n');

        await mongoose.disconnect();
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Failed to create/update admin user:', error);
        await mongoose.disconnect();
        process.exit(1);
    }
}

main();
