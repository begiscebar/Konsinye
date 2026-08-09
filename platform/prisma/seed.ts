import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "Password123!";

async function hash(pw: string) {
  return bcrypt.hash(pw, 10);
}

async function main() {
  console.log("Seeding Konsinye Freight…");

  const passwordHash = await hash(PASSWORD);

  // --- Companies ---
  const adminOrg = await prisma.company.create({
    data: { name: "Konsinye Freight (Platform)", type: "ADMIN_ORG", status: "APPROVED" },
  });

  const brokerCo = await prisma.company.create({
    data: {
      name: "Lonestar Freight Brokers",
      type: "BROKER",
      status: "APPROVED",
      phone: "555-010-2000",
      city: "Dallas",
      state: "TX",
    },
  });

  const carrierA = await prisma.company.create({
    data: {
      name: "Rodriguez Trucking LLC",
      type: "CARRIER",
      status: "APPROVED",
      mcNumber: "MC-778812",
      usdotNumber: "USDOT-3345521",
      minRate: 2.1,
      preferredStates: ["TX", "OK", "NM", "LA"],
      city: "Houston",
      state: "TX",
    },
  });

  const carrierB = await prisma.company.create({
    data: {
      name: "Great Plains Carriers Inc.",
      type: "CARRIER",
      status: "APPROVED",
      mcNumber: "MC-556213",
      usdotNumber: "USDOT-2219087",
      minRate: 1.85,
      preferredStates: ["KS", "MO", "NE", "IA"],
      city: "Kansas City",
      state: "MO",
    },
  });

  // --- Users ---
  const admin = await prisma.user.create({
    data: {
      name: "Alex Morgan",
      email: "admin@konsinye.com",
      passwordHash,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
      companyId: adminOrg.id,
    },
  });

  const dispatcher = await prisma.user.create({
    data: {
      name: "Jordan Blake",
      email: "dispatcher@konsinye.com",
      passwordHash,
      role: "DISPATCHER",
      status: "ACTIVE",
      companyId: adminOrg.id,
    },
  });

  const broker = await prisma.user.create({
    data: {
      name: "Sam Rivera",
      email: "broker@konsinye.com",
      passwordHash,
      role: "BROKER",
      status: "ACTIVE",
      companyId: brokerCo.id,
    },
  });

  const ownerA = await prisma.user.create({
    data: {
      name: "Maria Rodriguez",
      email: "owner1@konsinye.com",
      passwordHash,
      role: "TRUCK_OWNER",
      status: "ACTIVE",
      companyId: carrierA.id,
    },
  });

  const ownerB = await prisma.user.create({
    data: {
      name: "Dale Peterson",
      email: "owner2@konsinye.com",
      passwordHash,
      role: "TRUCK_OWNER",
      status: "ACTIVE",
      companyId: carrierB.id,
    },
  });

  const pendingOwner = await prisma.user.create({
    data: {
      name: "New Carrier Signup",
      email: "pending@konsinye.com",
      passwordHash,
      role: "TRUCK_OWNER",
      status: "PENDING",
      companyId: (
        await prisma.company.create({ data: { name: "Fresh Start Logistics", type: "CARRIER", status: "PENDING" } })
      ).id,
    },
  });

  // --- Trucks ---
  const truckA1 = await prisma.truck.create({
    data: {
      companyId: carrierA.id,
      unitNumber: "RT-101",
      equipmentType: "BOX_TRUCK_26FT",
      maxWeightLbs: 10000,
      homeCity: "Houston",
      homeState: "TX",
      currentCity: "Houston",
      currentState: "TX",
      status: "AVAILABLE",
      onTimeDeliveryRate: 0.96,
      avgRating: 4.8,
    },
  });

  const truckA2 = await prisma.truck.create({
    data: {
      companyId: carrierA.id,
      unitNumber: "RT-205",
      equipmentType: "SEMI_DRY_VAN",
      maxWeightLbs: 45000,
      homeCity: "Houston",
      homeState: "TX",
      currentCity: "San Antonio",
      currentState: "TX",
      status: "AVAILABLE",
      onTimeDeliveryRate: 0.91,
      avgRating: 4.5,
    },
  });

  const truckB1 = await prisma.truck.create({
    data: {
      companyId: carrierB.id,
      unitNumber: "GP-14",
      equipmentType: "NON_CDL_BOX_TRUCK",
      maxWeightLbs: 8000,
      homeCity: "Kansas City",
      homeState: "MO",
      currentCity: "Kansas City",
      currentState: "MO",
      status: "AVAILABLE",
      onTimeDeliveryRate: 0.88,
      avgRating: 4.2,
    },
  });

  // --- Drivers ---
  const driverA1User = await prisma.user.create({
    data: {
      name: "Carlos Nunez",
      email: "driver1@konsinye.com",
      passwordHash,
      role: "DRIVER",
      status: "ACTIVE",
      companyId: carrierA.id,
      phone: "555-020-1001",
    },
  });
  const driverA1 = await prisma.driverProfile.create({
    data: {
      userId: driverA1User.id,
      isCdlDriver: false,
      homeCity: "Houston",
      homeState: "TX",
      currentCity: "Houston",
      currentState: "TX",
      available: true,
      avgRating: 4.9,
      onTimeDeliveryRate: 0.97,
      currentTruckId: truckA1.id,
    },
  });

  const driverA2User = await prisma.user.create({
    data: {
      name: "Priya Shah",
      email: "driver2@konsinye.com",
      passwordHash,
      role: "DRIVER",
      status: "ACTIVE",
      companyId: carrierA.id,
      phone: "555-020-1002",
    },
  });
  const driverA2 = await prisma.driverProfile.create({
    data: {
      userId: driverA2User.id,
      isCdlDriver: true,
      cdlNumber: "TX-88213456",
      cdlState: "TX",
      homeCity: "San Antonio",
      homeState: "TX",
      currentCity: "San Antonio",
      currentState: "TX",
      available: true,
      avgRating: 4.6,
      onTimeDeliveryRate: 0.9,
      currentTruckId: truckA2.id,
    },
  });

  const driverB1User = await prisma.user.create({
    data: {
      name: "Tom Whitfield",
      email: "driver3@konsinye.com",
      passwordHash,
      role: "DRIVER",
      status: "ACTIVE",
      companyId: carrierB.id,
      phone: "555-020-1003",
    },
  });
  await prisma.driverProfile.create({
    data: {
      userId: driverB1User.id,
      isCdlDriver: false,
      homeCity: "Kansas City",
      homeState: "MO",
      currentCity: "Kansas City",
      currentState: "MO",
      available: true,
      avgRating: 4.3,
      onTimeDeliveryRate: 0.85,
      currentTruckId: truckB1.id,
    },
  });

  // --- Commission rules (platform-wide defaults, admin-configurable) ---
  await prisma.commissionRule.create({
    data: { name: "Standard platform commission", type: "PERCENTAGE", value: 10, active: true },
  });
  await prisma.commissionRule.create({
    data: { name: "Dispatcher flat fee", type: "DISPATCH_FLAT_FEE", value: 50, appliesToRole: "DISPATCHER", active: true },
  });

  // --- Compliance requirements (platform defaults) ---
  await prisma.complianceRequirement.create({
    data: { name: "Certificate of Insurance", documentType: "INSURANCE_COI", appliesToCompanyType: "CARRIER", active: true },
  });
  await prisma.complianceRequirement.create({
    data: { name: "MC Authority filing", documentType: "MC_AUTHORITY", appliesToCompanyType: "CARRIER", active: true },
  });
  await prisma.complianceRequirement.create({
    data: { name: "W-9", documentType: "W9", appliesToCompanyType: "CARRIER", active: true },
  });

  // Give carrierA a COI on file so the compliance page shows a mix of pass/fail.
  await prisma.document.create({
    data: {
      ownerType: "COMPANY",
      ownerCompanyId: carrierA.id,
      type: "INSURANCE_COI",
      fileName: "rodriguez-trucking-coi.pdf",
      fileUrl: "seed-placeholder-coi.pdf",
      uploadedByUserId: ownerA.id,
      status: "APPROVED",
      reviewedByUserId: admin.id,
      expirationDate: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
    },
  });

  // --- Loads ---
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const availableLoad = await prisma.load.create({
    data: {
      loadNumber: "KF-100001",
      status: "AVAILABLE",
      equipmentType: "BOX_TRUCK_26FT",
      brokerCompanyId: brokerCo.id,
      createdByUserId: broker.id,
      pickupLocation: "ABC Distribution Center",
      pickupAddress: "4500 Harbor Blvd",
      pickupCity: "Houston",
      pickupState: "TX",
      pickupApptStart: new Date(now + 2 * day),
      deliveryLocation: "Metro Retail Warehouse",
      deliveryAddress: "900 Commerce St",
      deliveryCity: "Austin",
      deliveryState: "TX",
      deliveryApptStart: new Date(now + 3 * day),
      commodity: "Packaged consumer goods",
      weightLbs: 6500,
      pieces: 24,
      rate: 850,
      miles: 165,
      specialRequirements: "Liftgate required at delivery",
    },
  });

  const offeredLoad = await prisma.load.create({
    data: {
      loadNumber: "KF-100002",
      status: "OFFERED",
      equipmentType: "NON_CDL_BOX_TRUCK",
      brokerCompanyId: brokerCo.id,
      createdByUserId: broker.id,
      dispatcherUserId: dispatcher.id,
      pickupLocation: "Sunrise Wholesale",
      pickupAddress: "12 Industrial Pkwy",
      pickupCity: "Kansas City",
      pickupState: "MO",
      pickupApptStart: new Date(now + 1 * day),
      deliveryLocation: "Midwest Grocers Hub",
      deliveryAddress: "88 Freight Way",
      deliveryCity: "St. Louis",
      deliveryState: "MO",
      deliveryApptStart: new Date(now + 2 * day),
      commodity: "Dry grocery",
      weightLbs: 5200,
      pieces: 40,
      rate: 620,
      miles: 250,
    },
  });
  await prisma.loadOffer.create({
    data: { loadId: offeredLoad.id, offeredToCompanyId: carrierB.id, offeredByUserId: dispatcher.id, matchScore: 88, status: "PENDING" },
  });
  await prisma.loadStatusEvent.create({ data: { loadId: offeredLoad.id, status: "OFFERED", changedByUserId: dispatcher.id } });

  const inTransitLoad = await prisma.load.create({
    data: {
      loadNumber: "KF-100003",
      status: "IN_TRANSIT",
      equipmentType: "SEMI_DRY_VAN",
      brokerCompanyId: brokerCo.id,
      createdByUserId: broker.id,
      dispatcherUserId: dispatcher.id,
      carrierCompanyId: carrierA.id,
      truckId: truckA2.id,
      driverProfileId: driverA2.id,
      pickupLocation: "Gulf Coast Manufacturing",
      pickupAddress: "77 Port Rd",
      pickupCity: "San Antonio",
      pickupState: "TX",
      pickupApptStart: new Date(now - 1 * day),
      deliveryLocation: "Southwest Distribution",
      deliveryAddress: "301 Commerce Cir",
      deliveryCity: "El Paso",
      deliveryState: "TX",
      deliveryApptStart: new Date(now + 1 * day),
      commodity: "Auto parts",
      weightLbs: 32000,
      pieces: 12,
      rate: 1450,
      miles: 550,
    },
  });
  await prisma.truck.update({ where: { id: truckA2.id }, data: { status: "ON_LOAD" } });
  for (const status of ["OFFERED", "ACCEPTED", "ASSIGNED", "DRIVER_CONFIRMED", "AT_PICKUP", "LOADED", "IN_TRANSIT"] as const) {
    await prisma.loadStatusEvent.create({ data: { loadId: inTransitLoad.id, status, changedByUserId: dispatcher.id } });
  }

  const completedLoad = await prisma.load.create({
    data: {
      loadNumber: "KF-100004",
      status: "COMPLETED",
      equipmentType: "BOX_TRUCK_26FT",
      brokerCompanyId: brokerCo.id,
      createdByUserId: broker.id,
      dispatcherUserId: dispatcher.id,
      carrierCompanyId: carrierA.id,
      truckId: truckA1.id,
      driverProfileId: driverA1.id,
      pickupLocation: "Bayside Foods",
      pickupAddress: "55 Dockside Ave",
      pickupCity: "Houston",
      pickupState: "TX",
      pickupApptStart: new Date(now - 5 * day),
      deliveryLocation: "Central Market Depot",
      deliveryAddress: "210 Main St",
      deliveryCity: "Dallas",
      deliveryState: "TX",
      deliveryApptStart: new Date(now - 4 * day),
      commodity: "Refrigerated snacks",
      weightLbs: 7200,
      pieces: 30,
      rate: 950,
      miles: 240,
    },
  });
  for (const status of [
    "OFFERED", "ACCEPTED", "ASSIGNED", "DRIVER_CONFIRMED", "AT_PICKUP", "LOADED",
    "IN_TRANSIT", "AT_DELIVERY", "DELIVERED", "POD_UPLOADED", "COMPLETED",
  ] as const) {
    await prisma.loadStatusEvent.create({ data: { loadId: completedLoad.id, status, changedByUserId: dispatcher.id } });
  }
  await prisma.loadFinancials.create({
    data: {
      loadId: completedLoad.id,
      grossRevenue: 950,
      platformCommission: 95,
      dispatcherCommission: 50,
      carrierPayment: 805,
      netAmount: 805,
      invoiceStatus: "INVOICED",
    },
  });

  await prisma.message.create({
    data: { loadId: inTransitLoad.id, senderId: dispatcher.id, body: "Heads up — construction on I-10, add ~20 min." },
  });
  await prisma.message.create({
    data: { loadId: inTransitLoad.id, senderId: driverA2User.id, body: "Copy that, rerouting now." },
  });

  console.log("\nSeed complete. Sign in with any of these (password: Password123!):");
  console.log("  Super Admin:  admin@konsinye.com");
  console.log("  Dispatcher:   dispatcher@konsinye.com");
  console.log("  Broker:       broker@konsinye.com");
  console.log("  Truck Owner:  owner1@konsinye.com (Rodriguez Trucking)");
  console.log("  Truck Owner:  owner2@konsinye.com (Great Plains Carriers)");
  console.log("  Driver:       driver1@konsinye.com (Carlos Nunez)");
  console.log("  Driver:       driver2@konsinye.com (Priya Shah)");
  console.log("  Pending:      pending@konsinye.com (not yet approved — try signing in!)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
