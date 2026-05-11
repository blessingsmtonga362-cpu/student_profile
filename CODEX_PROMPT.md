# CODEX AI - Quick Implementation Prompt

## PROJECT: NestJS Student Profile System - StudentProfile Entity Implementation

---

## CURRENT STATE
Your NestJS application has student data scattered across multiple tables:
- `User` table (auth credentials)
- `PersonalDetails` table (student info)
- `Education` table (school history)
- `Family` table (guardian info)
- `AcademicDetails` table (grades/program)
- `VerificationLog` table (document verification)

All tables use loose `userId` connections. **Problem**: Hard for admins to query complete student profiles.

**Database**: PostgreSQL with TypeORM 0.3.28

---

## SOLUTION: Create StudentProfile as Central Hub

Implement a new `StudentProfile` entity that:
1. Acts as parent table connecting all student data
2. Uses explicit TypeORM relationships (OneToMany, OneToOne)
3. Has unique `registrationNumber` as secondary identifier
4. Tracks `enrollmentStatus` (enrolled, graduated, suspended, dropped)
5. Enables single-query retrieval of all student data

---

## IMPLEMENTATION CHECKLIST

### 1. CREATE StudentProfile Entity
**File**: `src/application/entities/student-profile.entity.ts`

```typescript
- PrimaryGeneratedColumn('uuid') id
- OneToOne(() => User) user
- Column() registrationNumber (UNIQUE)
- Column() enrollmentStatus (enum: enrolled|graduated|suspended|dropped)
- Column() enrollmentDate
- OneToMany(() => PersonalDetails) personalDetails
- OneToMany(() => Education) educationHistory
- OneToMany(() => Family) familyMembers
- OneToOne(() => AcademicDetails) academicDetails
- OneToMany(() => VerificationLog) verificationLogs
- CreateDateColumn + UpdateDateColumn
```

### 2. UPDATE 5 EXISTING ENTITIES
Replace `userId` with `studentId` and add relationships:

**PersonalDetails**: Add @ManyToOne(() => StudentProfile, (sp) => sp.personalDetails)
**Education**: Add @ManyToOne(() => StudentProfile, (sp) => sp.educationHistory)
**Family**: Add @ManyToOne(() => StudentProfile, (sp) => sp.familyMembers)
**AcademicDetails**: Add @OneToOne(() => StudentProfile, (sp) => sp.academicDetails)
**VerificationLog**: Add @ManyToOne(() => StudentProfile, (sp) => sp.verificationLogs)

### 3. CREATE StudentProfileService
**File**: `src/application/services/student-profile.service.ts`

**Methods needed**:
- `createStudentProfile(userId, registrationNumber)` - Creates profile for user
- `getCompleteStudentProfile(registrationNumber)` - Returns all student data in one object with all relations
- `getStudentProfileById(id)` - Get by ID with relations
- `getAllStudents(page, limit)` - Paginated list of all students
- `updateEnrollmentStatus(registrationNumber, status)` - Change enrollment status
- `getStudentVerificationSummary(registrationNumber)` - Get verification status
- `deleteStudentProfile(id)` - Cascade delete

### 4. CREATE StudentProfileController
**File**: `src/application/controllers/student-profile.controller.ts`

**Endpoints**:
- `POST /student-profile/create` - Create profile
- `GET /student-profile/:registrationNumber` - Get complete profile
- `GET /student-profile` - List all students (paginated)
- `PATCH /student-profile/:registrationNumber/status` - Update status
- `GET /student-profile/:registrationNumber/verification-summary` - Get verifications
- `DELETE /student-profile/:id` - Delete profile

All endpoints protected with `@UseGuards(AuthGuard)`, admin endpoints with `@Roles(Role.Admin)`

### 5. CREATE StudentProfileModule
**File**: `src/application/modules/student-profile.module.ts`

### 6. UPDATE ApplicationModule
- Import StudentProfileModule
- Add StudentProfile to TypeOrmModule.forFeature()
- Add StudentProfileService and StudentProfileController

### 7. UPDATE ALL EXISTING SERVICES
Replace `userId` parameter with `studentId` in all service methods:
- PersonalDetailService
- EducationService
- FamilyService
- AcademicDetailService
- DocumentUploadService
- ReviewService

### 8. UPDATE ALL EXISTING CONTROLLERS
Fetch `StudentProfile` first, then use `studentId` instead of `userId` when calling services

### 9. CREATE DATABASE MIGRATION
```sql
-- Create student_profile table
-- Add student_id column to all related tables
-- Copy userId → student_id values
-- Add foreign key constraints
-- Drop old user_id columns
```

---

## KEY DESIGN DECISIONS

✅ Use `registrationNumber` as unique student identifier (not UUID)
✅ Keep `userId` relationship for User table
✅ Use `@OneToMany` for tables with multiple records per student
✅ Use `@OneToOne` for tables with single record per student
✅ Add `enrollmentStatus` enum for tracking student state
✅ Enable cascade deletes to clean up orphaned records

---

## FINAL QUERY EXAMPLE

After implementation, admins can get complete student profile with:
```typescript
const student = await studentProfileService.getCompleteStudentProfile('REG-20240001');

// Returns object with structure:
{
  id: 'uuid-123',
  registrationNumber: 'REG-20240001',
  enrollmentStatus: 'enrolled',
  enrollmentDate: '2024-01-15',
  user: { email, firstName, lastName },
  personalDetails: { firstName, phoneNumber, nationalId, ... },
  educationHistory: [ { schoolName, yearCompleted, fees }, ... ],
  familyMembers: [ { guardianName, profession }, ... ],
  academicDetails: { programOfStudy, department, gpa },
  verificationLogs: [ { documentType, isVerified }, ... ]
}
```

---

## SUCCESS METRICS

✅ Can retrieve complete student profile in single query
✅ Admin dashboard can display all student data organized
✅ Cascade delete removes all student records properly
✅ Unique registration numbers prevent duplicates
✅ Data integrity maintained with foreign keys

---

## FILES TO CREATE/MODIFY

**Create**:
- src/application/entities/student-profile.entity.ts
- src/application/services/student-profile.service.ts
- src/application/controllers/student-profile.controller.ts
- src/application/modules/student-profile.module.ts
- Migration file for database schema changes

**Modify**:
- src/application/application.module.ts
- src/application/entities/personal_details.entity.ts
- src/application/entities/education.entity.ts
- src/application/entities/family.entity.ts
- src/application/entities/academic_details.entity.ts
- src/application/entities/verification-log.entity.ts
- All 6 services (change userId → studentId)
- All 6 controllers (fetch StudentProfile first)

---

## IMPORTANT

- This is a breaking change - will need data migration
- Update all userId references to studentId
- Ensure foreign key constraints are set correctly
- Test with pagination, filtering, cascade deletes
- Update API documentation after implementation
