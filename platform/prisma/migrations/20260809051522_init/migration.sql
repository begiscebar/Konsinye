-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'DISPATCHER', 'TRUCK_OWNER', 'DRIVER', 'BROKER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED');

-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('ADMIN_ORG', 'CARRIER', 'DISPATCH_ORG', 'BROKER');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('PENDING', 'APPROVED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EquipmentType" AS ENUM ('BOX_TRUCK_26FT', 'NON_CDL_BOX_TRUCK', 'CDL_BOX_TRUCK', 'SEMI_DRY_VAN', 'SEMI_REEFER', 'SEMI_FLATBED', 'SPRINTER_VAN', 'OTHER');

-- CreateEnum
CREATE TYPE "TruckStatus" AS ENUM ('AVAILABLE', 'ON_LOAD', 'MAINTENANCE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('AVAILABLE', 'OFFERED', 'ACCEPTED', 'ASSIGNED', 'DRIVER_CONFIRMED', 'AT_PICKUP', 'LOADED', 'IN_TRANSIT', 'AT_DELIVERY', 'DELIVERED', 'POD_UPLOADED', 'COMPLETED', 'PAYMENT_PENDING', 'PAID', 'CANCELLED', 'REJECTED', 'DISPUTED', 'DELAYED');

-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "DocumentOwnerType" AS ENUM ('USER', 'COMPANY', 'TRUCK', 'LOAD');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CDL', 'DRIVER_LICENSE', 'MEDICAL_CARD', 'INSURANCE_COI', 'W9', 'BOL', 'POD', 'RATE_CONFIRMATION', 'MC_AUTHORITY', 'USDOT_REGISTRATION', 'BOC3', 'UCR', 'VEHICLE_REGISTRATION', 'DRUG_ALCOHOL_COMPLIANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('LOAD_AVAILABLE', 'LOAD_OFFERED', 'LOAD_ACCEPTED', 'LOAD_REJECTED', 'DRIVER_ASSIGNED', 'PICKUP_APPROACHING', 'DELIVERY_APPROACHING', 'DELAY_REPORTED', 'DOCUMENT_EXPIRING', 'POD_UPLOADED', 'PAYMENT_RECEIVED', 'PAYMENT_PENDING', 'ADMIN_APPROVAL', 'COMPLIANCE_ISSUE', 'MESSAGE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "CommissionRuleType" AS ENUM ('PERCENTAGE', 'FLAT_PER_LOAD', 'DISPATCH_FLAT_FEE', 'SUBSCRIPTION', 'MEMBERSHIP', 'BROKER_FEE');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('NOT_INVOICED', 'INVOICED', 'PAYMENT_PENDING', 'PAID', 'DISPUTED');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CompanyType" NOT NULL,
    "status" "CompanyStatus" NOT NULL DEFAULT 'PENDING',
    "mcNumber" TEXT,
    "usdotNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "addressLine" TEXT,
    "city" TEXT,
    "state" TEXT,
    "zip" TEXT,
    "minRate" DOUBLE PRECISION,
    "preferredLanes" JSONB,
    "preferredStates" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "companyId" TEXT,
    "emailVerified" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "cdlNumber" TEXT,
    "cdlState" TEXT,
    "isCdlDriver" BOOLEAN NOT NULL DEFAULT false,
    "medicalCardExpiry" TIMESTAMP(3),
    "homeCity" TEXT,
    "homeState" TEXT,
    "currentCity" TEXT,
    "currentState" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "avgRating" DOUBLE PRECISION,
    "onTimeDeliveryRate" DOUBLE PRECISION,
    "currentTruckId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "unitNumber" TEXT NOT NULL,
    "equipmentType" "EquipmentType" NOT NULL,
    "vin" TEXT,
    "plate" TEXT,
    "maxWeightLbs" INTEGER,
    "status" "TruckStatus" NOT NULL DEFAULT 'AVAILABLE',
    "homeCity" TEXT,
    "homeState" TEXT,
    "currentCity" TEXT,
    "currentState" TEXT,
    "onTimeDeliveryRate" DOUBLE PRECISION,
    "avgRating" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Load" (
    "id" TEXT NOT NULL,
    "loadNumber" TEXT NOT NULL,
    "status" "LoadStatus" NOT NULL DEFAULT 'AVAILABLE',
    "equipmentType" "EquipmentType" NOT NULL,
    "brokerCompanyId" TEXT NOT NULL,
    "createdByUserId" TEXT NOT NULL,
    "dispatcherUserId" TEXT,
    "carrierCompanyId" TEXT,
    "truckId" TEXT,
    "driverProfileId" TEXT,
    "pickupLocation" TEXT NOT NULL,
    "pickupAddress" TEXT NOT NULL,
    "pickupCity" TEXT NOT NULL,
    "pickupState" TEXT NOT NULL,
    "pickupLat" DOUBLE PRECISION,
    "pickupLng" DOUBLE PRECISION,
    "pickupApptStart" TIMESTAMP(3) NOT NULL,
    "pickupApptEnd" TIMESTAMP(3),
    "deliveryLocation" TEXT NOT NULL,
    "deliveryAddress" TEXT NOT NULL,
    "deliveryCity" TEXT NOT NULL,
    "deliveryState" TEXT NOT NULL,
    "deliveryLat" DOUBLE PRECISION,
    "deliveryLng" DOUBLE PRECISION,
    "deliveryApptStart" TIMESTAMP(3) NOT NULL,
    "deliveryApptEnd" TIMESTAMP(3),
    "commodity" TEXT NOT NULL,
    "weightLbs" INTEGER NOT NULL,
    "dimensions" TEXT,
    "pieces" INTEGER,
    "rate" DOUBLE PRECISION NOT NULL,
    "miles" DOUBLE PRECISION,
    "specialRequirements" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadOffer" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "offeredToCompanyId" TEXT NOT NULL,
    "offeredByUserId" TEXT NOT NULL,
    "matchScore" INTEGER,
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadStatusEvent" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "status" "LoadStatus" NOT NULL,
    "changedByUserId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadStatusEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "ownerType" "DocumentOwnerType" NOT NULL,
    "ownerUserId" TEXT,
    "ownerCompanyId" TEXT,
    "ownerTruckId" TEXT,
    "ownerLoadId" TEXT,
    "type" "DocumentType" NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "uploadedByUserId" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "reviewedByUserId" TEXT,
    "expirationDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceRequirement" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "documentType" "DocumentType" NOT NULL,
    "appliesToCompanyType" "CompanyType",
    "appliesToEquipment" "EquipmentType",
    "requiresCdl" BOOLEAN,
    "interstate" BOOLEAN,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "loadId" TEXT,
    "senderId" TEXT NOT NULL,
    "recipientId" TEXT,
    "body" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "relatedLoadId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommissionRuleType" NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "appliesToRole" "UserRole",
    "companyId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadFinancials" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "grossRevenue" DOUBLE PRECISION NOT NULL,
    "platformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "dispatcherCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "otherFees" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carrierPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "driverPayment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "invoiceStatus" "InvoiceStatus" NOT NULL DEFAULT 'NOT_INVOICED',
    "paymentDate" TIMESTAMP(3),
    "transactionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LoadFinancials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "renewalDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Rating" (
    "id" TEXT NOT NULL,
    "loadId" TEXT NOT NULL,
    "ratedByUserId" TEXT NOT NULL,
    "ratedUserId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_type_idx" ON "Company"("type");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_userId_key" ON "DriverProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "DriverProfile_currentTruckId_key" ON "DriverProfile"("currentTruckId");

-- CreateIndex
CREATE INDEX "Truck_companyId_idx" ON "Truck"("companyId");

-- CreateIndex
CREATE INDEX "Truck_status_idx" ON "Truck"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Load_loadNumber_key" ON "Load"("loadNumber");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_brokerCompanyId_idx" ON "Load"("brokerCompanyId");

-- CreateIndex
CREATE INDEX "Load_carrierCompanyId_idx" ON "Load"("carrierCompanyId");

-- CreateIndex
CREATE INDEX "Load_dispatcherUserId_idx" ON "Load"("dispatcherUserId");

-- CreateIndex
CREATE INDEX "Load_pickupState_idx" ON "Load"("pickupState");

-- CreateIndex
CREATE INDEX "Load_deliveryState_idx" ON "Load"("deliveryState");

-- CreateIndex
CREATE INDEX "LoadOffer_loadId_idx" ON "LoadOffer"("loadId");

-- CreateIndex
CREATE INDEX "LoadOffer_offeredToCompanyId_idx" ON "LoadOffer"("offeredToCompanyId");

-- CreateIndex
CREATE INDEX "LoadStatusEvent_loadId_idx" ON "LoadStatusEvent"("loadId");

-- CreateIndex
CREATE INDEX "Document_ownerType_ownerUserId_idx" ON "Document"("ownerType", "ownerUserId");

-- CreateIndex
CREATE INDEX "Document_ownerCompanyId_idx" ON "Document"("ownerCompanyId");

-- CreateIndex
CREATE INDEX "Document_ownerTruckId_idx" ON "Document"("ownerTruckId");

-- CreateIndex
CREATE INDEX "Document_ownerLoadId_idx" ON "Document"("ownerLoadId");

-- CreateIndex
CREATE INDEX "Document_expirationDate_idx" ON "Document"("expirationDate");

-- CreateIndex
CREATE INDEX "Message_loadId_idx" ON "Message"("loadId");

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "Message"("senderId");

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "Message"("recipientId");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE UNIQUE INDEX "LoadFinancials_loadId_key" ON "LoadFinancials"("loadId");

-- CreateIndex
CREATE INDEX "Rating_ratedUserId_idx" ON "Rating"("ratedUserId");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_idx" ON "AuditLog"("actorUserId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverProfile" ADD CONSTRAINT "DriverProfile_currentTruckId_fkey" FOREIGN KEY ("currentTruckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Truck" ADD CONSTRAINT "Truck_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_brokerCompanyId_fkey" FOREIGN KEY ("brokerCompanyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_dispatcherUserId_fkey" FOREIGN KEY ("dispatcherUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_carrierCompanyId_fkey" FOREIGN KEY ("carrierCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_driverProfileId_fkey" FOREIGN KEY ("driverProfileId") REFERENCES "DriverProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOffer" ADD CONSTRAINT "LoadOffer_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadOffer" ADD CONSTRAINT "LoadOffer_offeredByUserId_fkey" FOREIGN KEY ("offeredByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadStatusEvent" ADD CONSTRAINT "LoadStatusEvent_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadStatusEvent" ADD CONSTRAINT "LoadStatusEvent_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerCompanyId_fkey" FOREIGN KEY ("ownerCompanyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerTruckId_fkey" FOREIGN KEY ("ownerTruckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerLoadId_fkey" FOREIGN KEY ("ownerLoadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceRequirement" ADD CONSTRAINT "ComplianceRequirement_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadFinancials" ADD CONSTRAINT "LoadFinancials_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_loadId_fkey" FOREIGN KEY ("loadId") REFERENCES "Load"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratedByUserId_fkey" FOREIGN KEY ("ratedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Rating" ADD CONSTRAINT "Rating_ratedUserId_fkey" FOREIGN KEY ("ratedUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
