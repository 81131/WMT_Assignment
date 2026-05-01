const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');

const User = require('../models/User');
const Branch = require('../models/Branch');
const Hall = require('../models/Hall');

const seed = async () => {
  await connectDB();
  console.log('🌱 Seeding database...');

  // Clear existing data
  await User.deleteMany({});
  await Branch.deleteMany({});
  await Hall.deleteMany({});

  // Create main manager
  const mainManager = await User.create({
    name: 'Main Manager',
    email: 'manager@cinema.lk',
    passwordHash: process.env.MAIN_MANAGER_PASSWORD || 'Password@123',
    role: 'main_manager',
  });
  console.log('✅ Main manager created: manager@cinema.lk');

  // Create branches
  const branch1 = await Branch.create({
    name: 'Cinema City Colombo',
    address: '123 Galle Road, Colombo 03',
    city: 'Colombo',
    phone: '0112345678',
  });

  const branch2 = await Branch.create({
    name: 'Cinema City Kandy',
    address: '45 Peradeniya Road, Kandy',
    city: 'Kandy',
    phone: '0812345678',
  });

  // Create branch manager
  const branchMgr = await User.create({
    name: 'Colombo Branch Manager',
    email: 'branch@cinema.lk',
    passwordHash: process.env.DUMMY_PASSWORD || 'Password@123',
    role: 'branch_manager',
    assignedBranch: branch1._id,
  });
  console.log('✅ Branch manager created: branch@cinema.lk');

  // Create hall with layout for branch1
  const hallSeats = [];
  const rows = 6, cols = 10;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rowLetter = String.fromCharCode(65 + r);
      let type = 'regular';
      if (r === 0) type = 'lobby';
      else if (r === rows - 1) type = 'vip';
      else if (c === 0 || c === cols - 1) type = 'producer';
      hallSeats.push({ seatId: `${rowLetter}${c + 1}`, type, row: r, col: c, isActive: true });
    }
  }

  const hall1 = await Hall.create({
    branch: branch1._id,
    name: 'Hall 1 - IMAX',
    screenType: 'IMAX',
    layoutConfig: { rows, cols, seats: hallSeats },
  });

  // Hall employee
  const employee = await User.create({
    name: 'Hall Employee',
    email: 'employee@cinema.lk',
    passwordHash: process.env.DUMMY_PASSWORD || 'Password@123',
    role: 'hall_employee',
    assignedBranch: branch1._id,
    assignedHalls: [hall1._id],
  });
  console.log('✅ Hall employee created: employee@cinema.lk');

  // Customer
  await User.create({
    name: 'Test Customer',
    email: 'customer@cinema.lk',
    passwordHash: process.env.DUMMY_PASSWORD || 'Password@123',
    role: 'customer',
  });
  console.log('✅ Test customer created: customer@cinema.lk');

  console.log('\n🎬 Seed complete!');
  process.exit(0);
};

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
