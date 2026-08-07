import { PrismaClient, Role, ApprovalStatus, TransactionType, VerificationEntityType, NotificationType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// BUG FIX: the previous seed used placeholder strings like
// '$2b$10$xyzDemoHashForAdminUser1mgStyleSecret' as passwordHash values.
// Those are not valid bcrypt hashes, so bcrypt.compare() in
// app/api/auth/login/route.ts could never match them — none of the seeded
// demo accounts (admin@meditrack.com, doctor@meditrack.com,
// pharmacist@meditrack.com) could actually log in.
//
// This is a demo-only password, intentionally simple and printed to the
// console below. Do not reuse it, and never seed real hashed passwords into
// source control for a production database.
const DEMO_PASSWORD = 'Demo@12345';
const DEMO_PASSWORD_HASH = bcrypt.hashSync(DEMO_PASSWORD, 10);

async function main() {
  console.log('Seeding lookup tables (Categories & Manufacturers)...');

  // Categories
  const categoryCardiac = await prisma.medicineCategory.upsert({
    where: { name: 'Cardiac' },
    update: {},
    create: { name: 'Cardiac' },
  });

  const categoryDiabetes = await prisma.medicineCategory.upsert({
    where: { name: 'Diabetes' },
    update: {},
    create: { name: 'Diabetes' },
  });

  const categoryAntibiotics = await prisma.medicineCategory.upsert({
    where: { name: 'Antibiotics' },
    update: {},
    create: { name: 'Antibiotics' },
  });

  // Manufacturers
  const manufacturerAbbott = await prisma.medicineManufacturer.upsert({
    where: { name: 'Abbott Laboratories' },
    update: {},
    create: { name: 'Abbott Laboratories' },
  });

  const manufacturerPfizer = await prisma.medicineManufacturer.upsert({
    where: { name: 'Pfizer Inc.' },
    update: {},
    create: { name: 'Pfizer Inc.' },
  });

  console.log('Seeding addresses...');
  const pharmacyAddress = await prisma.address.create({
    data: {
      line1: '123 Health Ave',
      line2: 'Suite 400',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      postalCode: '400001',
    },
  });

  const patientAddress = await prisma.address.create({
    data: {
      line1: '456 Patient Lane',
      line2: 'Block B',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      postalCode: '110001',
    },
  });

  console.log('Seeding users (Admin, Doctor, Pharmacist)...');

  // 1. Admin
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@meditrack.com' },
    update: {},
    create: {
      email: 'admin@meditrack.com',
      passwordHash: DEMO_PASSWORD_HASH,
      role: Role.ADMIN,
      adminProfile: {
        create: {
          name: 'Super Admin',
          employeeId: 'ADM-001',
          department: 'Compliance',
        },
      },
    },
    include: {
      adminProfile: true,
    },
  });

  // 2. Doctor
  const doctorUser = await prisma.user.upsert({
    where: { email: 'doctor@meditrack.com' },
    update: {},
    create: {
      email: 'doctor@meditrack.com',
      passwordHash: DEMO_PASSWORD_HASH,
      role: Role.DOCTOR,
      doctorProfile: {
        create: {
          name: 'Dr. Sarah Connor',
          email: 'doctor@meditrack.com',
          specialization: 'Cardiology',
          licenseNumber: 'DOC-12345',
          phone: '+919876543210',
          status: ApprovalStatus.VERIFIED,
          regNo: 'MCI-9988',
          hospital: 'Metro Cardiac Centre',
          experience: '12 Years',
          consultationFee: 800,
        },
      },
    },
    include: {
      doctorProfile: true,
    },
  });

  // 3. Pharmacist
  const pharmacistUser = await prisma.user.upsert({
    where: { email: 'pharmacist@meditrack.com' },
    update: {},
    create: {
      email: 'pharmacist@meditrack.com',
      passwordHash: DEMO_PASSWORD_HASH,
      role: Role.PHARMACIST,
      pharmacistProfile: {
        create: {
          name: 'John Doe',
          email: 'pharmacist@meditrack.com',
          licenseNumber: 'PHARM-67890',
          phone: '+918765432109',
          qualifications: 'B.Pharm, M.Pharm',
          status: ApprovalStatus.VERIFIED,
          regNo: 'PR-7766',
          experience: '6 Years',
        },
      },
    },
    include: {
      pharmacistProfile: true,
    },
  });

  console.log('Seeding Patient record...');
  const patient = await prisma.patient.upsert({
    where: { phone: '+919999999999' },
    update: {},
    create: {
      name: 'Alice Smith',
      dateOfBirth: new Date('1990-05-15'),
      gender: 'Female',
      phone: '+919999999999',
      email: 'alice.smith@example.com',
      addressId: patientAddress.id,
    },
  });

  console.log('Seeding Pharmacy...');
  const pharmacistProfile = pharmacistUser.pharmacistProfile;
  if (!pharmacistProfile) {
    throw new Error('Pharmacist Profile was not seeded correctly.');
  }

  const pharmacy = await prisma.pharmacy.upsert({
    where: { email: 'mumbaipharmacy@meditrack.com' },
    update: {},
    create: {
      name: 'Tata 1mg Partner Pharmacy - Mumbai',
      email: 'mumbaipharmacy@meditrack.com',
      phone: '+912255554444',
      addressId: pharmacyAddress.id,
      licenseNumber: 'DL-MUM-887766',
      status: ApprovalStatus.VERIFIED,
      managerId: pharmacistProfile.id,
      drugLicense: 'LIC-DRUG-001',
      gst: '27AAAAA1111A1Z1',
      ownerName: 'Apex Health Retail Pvt Ltd',
    },
  });

  console.log('Seeding Medicines...');
  const medicineAspirin = await prisma.medicine.upsert({
    where: { name: 'Aspirin 75mg' },
    update: {},
    create: {
      name: 'Aspirin 75mg',
      genericName: 'Aspirin',
      brandName: 'Ecosprin 75',
      strength: '75mg',
      dosageForm: 'Tablet',
      packSize: '14 Tablets',
      requiresPrescription: true,
      description: 'Used for prevention of heart attacks and strokes.',
      categoryId: categoryCardiac.id,
      manufacturerId: manufacturerAbbott.id,
    },
  });

  const medicineMetformin = await prisma.medicine.upsert({
    where: { name: 'Metformin 500mg' },
    update: {},
    create: {
      name: 'Metformin 500mg',
      genericName: 'Metformin Hydrochloride',
      brandName: 'Glycomet 500',
      strength: '500mg',
      dosageForm: 'Tablet',
      packSize: '10 Tablets',
      requiresPrescription: true,
      description: 'First-line medication for the treatment of type 2 diabetes.',
      categoryId: categoryDiabetes.id,
      manufacturerId: manufacturerPfizer.id,
    },
  });

  console.log('Seeding Pharmacy Inventory & Batches...');
  const inventoryAspirin = await prisma.pharmacyInventory.upsert({
    where: {
      pharmacyId_medicineId: {
        pharmacyId: pharmacy.id,
        medicineId: medicineAspirin.id,
      },
    },
    update: {},
    create: {
      pharmacyId: pharmacy.id,
      medicineId: medicineAspirin.id,
      stock: 500,
      minStock: 50,
      price: 15.5,
      status: 'ACTIVE',
      batches: {
        create: {
          batchNumber: 'ASP-B01',
          manufactureDate: new Date('2026-01-10'),
          expiryDate: new Date('2028-01-10'),
          purchasePrice: 10.0,
          sellingPrice: 15.5,
          quantity: 500,
        },
      },
    },
  });

  const inventoryMetformin = await prisma.pharmacyInventory.upsert({
    where: {
      pharmacyId_medicineId: {
        pharmacyId: pharmacy.id,
        medicineId: medicineMetformin.id,
      },
    },
    update: {},
    create: {
      pharmacyId: pharmacy.id,
      medicineId: medicineMetformin.id,
      stock: 300,
      minStock: 30,
      price: 25.0,
      status: 'ACTIVE',
      batches: {
        create: {
          batchNumber: 'MET-B02',
          manufactureDate: new Date('2026-02-15'),
          expiryDate: new Date('2028-02-15'),
          purchasePrice: 18.0,
          sellingPrice: 25.0,
          quantity: 300,
        },
      },
    },
  });

  console.log('Seeding Inventory Transactions...');
  await prisma.inventoryTransaction.createMany({
    data: [
      {
        inventoryId: inventoryAspirin.id,
        quantity: 500,
        type: TransactionType.STOCK_IN,
        reason: 'Initial procurement batch ASP-B01',
        performedBy: pharmacistProfile.id,
      },
      {
        inventoryId: inventoryMetformin.id,
        quantity: 300,
        type: TransactionType.STOCK_IN,
        reason: 'Initial procurement batch MET-B02',
        performedBy: pharmacistProfile.id,
      },
    ],
  });

  console.log('Seeding Verification Requests...');
  await prisma.verificationRequest.create({
    data: {
      entityType: VerificationEntityType.PHARMACIST,
      entityId: pharmacistProfile.id,
      status: ApprovalStatus.VERIFIED,
      remarks: 'All documents verified and license matched against registry.',
      reviewedBy: adminUser.adminProfile?.id,
      reviewedAt: new Date(),
    },
  });

  console.log('Seeding Notifications...');
  await prisma.notification.create({
    data: {
      userId: adminUser.id,
      message: 'New pharmacist registration request received.',
      type: NotificationType.INFO,
      title: 'Pending Verification',
      body: 'John Doe has requested pharmacist access.',
    },
  });

  console.log('Seeding completed successfully!');
  console.log('');
  console.log('Demo login credentials (all roles share the same password):');
  console.log('  admin@meditrack.com      / ' + DEMO_PASSWORD);
  console.log('  doctor@meditrack.com     / ' + DEMO_PASSWORD);
  console.log('  pharmacist@meditrack.com / ' + DEMO_PASSWORD);
  console.log('These are for local/demo use only — never seed real credentials this way.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
