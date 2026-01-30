-- CreateTable
CREATE TABLE "SiteVisitRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "projectName" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "targetBhId" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteVisitRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowroomVisitRequest" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sourceShowroom" TEXT NOT NULL,
    "destinationShowroom" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "targetBhId" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "bhStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "hrStatus" "RequestStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowroomVisitRequest_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SiteVisitRequest" ADD CONSTRAINT "SiteVisitRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowroomVisitRequest" ADD CONSTRAINT "ShowroomVisitRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
