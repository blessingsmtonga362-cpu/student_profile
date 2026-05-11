# Student Profile Architecture Implementation Prompt

## PROJECT CONTEXT

You are working on a **NestJS Student Profile Management System** built with:
- **Framework**: NestJS 11.0.1
- **Database**: PostgreSQL with TypeORM 0.3.28
- **Authentication**: JWT-based auth with AuthGuard
- **Package Manager**: npm

**Current Location**: `/home/blessings/projects/nestnzeru/student_profile`

---

## CURRENT SYSTEM STATE

### Existing Database Schema
The system currently has a **fragmented data model** where student information is scattered across multiple tables:

**Current Structure (WHAT WE'RE FIXING):**
```
User Table (auth, email, password, role)
├─ PersonalDetails (userId) → first_name, last_name, national_id, phone
├─ AcademicDetails (userId) → program_of_study, department, year_of_study
├─ Education (userId) → school_name, tuition_fees, year_completed
├─ Family (userId) → guardian_name, profession, education_level
└─ VerificationLog (userId) → document_type, is_verified, mismatches
```

**Problem**: No clear parent-child relationship. Data is loosely connected via `userId`. Admin queries are complex and fragmented.

---

## IMPLEMENTATION OBJECTIVE

Create a **StudentProfile entity** as a **central hub** that organizes all student data in a hierarchical, queryable structure while maintaining data integrity through explicit TypeORM relationships.

---

## DETAILED IMPLEMENTATION STEPS

### STEP 1: Create StudentProfile Entity
**File**: `src/application/entities/student-profile.entity.ts`

**Requirements**:
```typescript
- PrimaryGeneratedColumn('uuid') - id
- OneToOne(() => User) - Link to user account
- Column('registrationNumber') - UNIQUE, secondary identifier for students
- Column('enrollmentStatus') - Enum: 'enrolled' | 'graduated' | 'suspended' | 'dropped'
- Column('enrollmentDate') - When student enrolled
- OneToMany(() => PersonalDetails) - Can have personal details
- OneToMany(() => Education) - Multiple education records
- OneToMany(() => Family) - Multiple family members
- OneToOne(() => AcademicDetails) - Academic info
- OneToMany(() => VerificationLog) - All verification history
- CreateDateColumn, UpdateDateColumn - Timestamps
- JoinColumn decorators where needed
```

**Key Design Decisions**:
- `studentId` field in other entities should replace `userId` 
- Registration number should be unique at StudentProfile level
- Use `@OneToMany` for tables that can have multiple records per student
- Use `@OneToOne` for tables that should have exactly one record per student

---

### STEP 2: Update Existing Entities
Update these 5 entities to add proper relationships and change `userId` to `studentId`:

#### A. PersonalDetails Entity
**File**: `src/application/entities/personal_details.entity.ts`
- Replace `@Column({ name: 'user_id' })` with `@Column({ name: 'student_id' })`
- Rename `userId: string` to `studentId: string`
- Add: `@ManyToOne(() => StudentProfile, (sp) => sp.personalDetails)`
- Add: `@JoinColumn({ name: 'student_id' })`
- Add inverse relation: `student: StudentProfile`

#### B. AcademicDetails Entity
**File**: `src/application/entities/academic_details.entity.ts`
- Replace `userId` with `studentId`
- Add: `@OneToOne(() => StudentProfile, (sp) => sp.academicDetails)`
- Add: `@JoinColumn({ name: 'student_id' })`
- Add inverse relation: `student: StudentProfile`

#### C. Education Entity
**File**: `src/application/entities/education.entity.ts`
- Replace `userId` with `studentId`
- Add: `@ManyToOne(() => StudentProfile, (sp) => sp.educationHistory)`
- Add: `@JoinColumn({ name: 'student_id' })`
- Add inverse relation: `student: StudentProfile`

#### D. Family Entity
**File**: `src/application/entities/family.entity.ts`
- Replace `userId` with `studentId`
- Add: `@ManyToOne(() => StudentProfile, (sp) => sp.familyMembers)`
- Add: `@JoinColumn({ name: 'student_id' })`
- Add inverse relation: `student: StudentProfile`

#### E. VerificationLog Entity
**File**: `src/application/entities/verification-log.entity.ts`
- Replace `userId` with `studentId`
- Add: `@ManyToOne(() => StudentProfile, (sp) => sp.verificationLogs)`
- Add: `@JoinColumn({ name: 'student_id' })`
- Add inverse relation: `student: StudentProfile`

---

### STEP 3: Create StudentProfile Module
**Create new file**: `src/application/modules/student-profile.module.ts`

```typescript
Requirements:
- Import: TypeOrmModule.forFeature([StudentProfile, ...all related entities])
- Import: FileModule, UserModule, AuthModule
- Create service: StudentProfileService
- Create controller: StudentProfileController
- Export service for use in other modules
```

---

### STEP 4: Create StudentProfileService
**File**: `src/application/services/student-profile.service.ts`

**Core Methods**:

1. **createStudentProfile(userId, createDto)**
   - Link User to StudentProfile
   - Generate registration_number (format: REG-YYYY-XXXX)
   - Set enrollmentStatus to 'enrolled'
   - Return created StudentProfile

2. **getCompleteStudentProfile(registrationNumber)**
   - Query with relations: personalDetails, educationHistory, familyMembers, academicDetails, verificationLogs, user
   - Return complete aggregated student data as one object
   - Used by admin dashboard

3. **getStudentProfileById(id)**
   - Query with all relations
   - Return complete profile

4. **getAllStudents(paginationDto)**
   - Return paginated list of all students with summary data
   - Include: registrationNumber, firstName, lastName, enrollmentStatus, enrollmentDate

5. **updateEnrollmentStatus(registrationNumber, newStatus)**
   - Update enrollmentStatus enum field
   - Useful for graduation, suspension, etc.

6. **getStudentVerificationSummary(registrationNumber)**
   - Get all verification logs for a student
   - Return: documents verified, pending, failed

7. **deleteStudentProfile(id)**
   - Cascade delete all related records
   - Remove user if needed

**Validation Rules**:
- Registration number must be unique
- Cannot create StudentProfile for non-existent User
- Cannot create duplicate StudentProfile for same User

---

### STEP 5: Create StudentProfileController
**File**: `src/application/controllers/student-profile.controller.ts`

**Endpoints**:

```
POST /student-profile/create
  - Body: { userId, registrationNumber? }
  - Returns: complete StudentProfile
  
GET /student-profile/:registrationNumber
  - Returns: complete student profile with all nested data
  - Admin use case: view complete student file
  
GET /student-profile
  - Query params: page, limit
  - Returns: paginated list of all students
  
PATCH /student-profile/:registrationNumber/status
  - Body: { enrollmentStatus }
  - Returns: updated StudentProfile
  
GET /student-profile/:registrationNumber/verification-summary
  - Returns: verification status for all documents
  
DELETE /student-profile/:id
  - Deletes student profile and all related data
```

**Guards & Permissions**:
- All endpoints: `@UseGuards(AuthGuard)`
- Admin-only endpoints: `@UseGuards(AuthGuard, RolesGuard)` with `@Roles(Role.Admin)`

---

### STEP 6: Update ApplicationModule
**File**: `src/application/application.module.ts`

**Changes**:
- Import: StudentProfileModule
- Import: StudentProfile entity in TypeOrmModule.forFeature()
- Add StudentProfileService and StudentProfileController to providers/controllers
- Export StudentProfileService

---

### STEP 7: Create Database Migration
**Purpose**: Migrate existing data from `userId` to `studentId` and create StudentProfile records

**Migration Steps**:
1. Add `student_id` column to all affected tables (PersonalDetails, Education, Family, AcademicDetails, VerificationLog)
2. Create StudentProfile record for each User
3. Populate `registrationNumber` for each StudentProfile (format: REG-YYYYMMDD-XXXX)
4. Copy `userId` values to `student_id` for all related entities
5. Drop old `user_id` columns
6. Add foreign key constraints from child tables to StudentProfile

**Example Migration Logic**:
```sql
-- Create StudentProfile table
CREATE TABLE student_profile (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  registration_number VARCHAR(50) UNIQUE NOT NULL,
  enrollment_status VARCHAR(50) DEFAULT 'enrolled',
  enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- For each User, create a StudentProfile
INSERT INTO student_profile (user_id, registration_number, enrollment_date)
SELECT u.id, 'REG-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(ROW_NUMBER() OVER (ORDER BY u.id)::text, 4, '0'), NOW()
FROM users u;

-- Add student_id column to existing tables
ALTER TABLE personal_details ADD COLUMN student_id UUID;
ALTER TABLE education ADD COLUMN student_id UUID;
ALTER TABLE family ADD COLUMN student_id UUID;
ALTER TABLE academic_details ADD COLUMN student_id UUID;
ALTER TABLE verification_logs ADD COLUMN student_id UUID;

-- Copy data from user_id to student_id
UPDATE personal_details SET student_id = (SELECT sp.id FROM student_profile sp WHERE sp.user_id = personal_details.user_id);
UPDATE education SET student_id = (SELECT sp.id FROM student_profile sp WHERE sp.user_id = education.user_id);
UPDATE family SET student_id = (SELECT sp.id FROM student_profile sp WHERE sp.user_id = family.user_id);
UPDATE academic_details SET student_id = (SELECT sp.id FROM student_profile sp WHERE sp.user_id = academic_details.user_id);
UPDATE verification_logs SET student_id = (SELECT sp.id FROM student_profile sp WHERE sp.user_id = verification_logs.user_id);

-- Add foreign key constraints
ALTER TABLE personal_details ADD CONSTRAINT fk_personal_details_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE;
ALTER TABLE education ADD CONSTRAINT fk_education_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE;
ALTER TABLE family ADD CONSTRAINT fk_family_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE;
ALTER TABLE academic_details ADD CONSTRAINT fk_academic_details_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE;
ALTER TABLE verification_logs ADD CONSTRAINT fk_verification_logs_student FOREIGN KEY (student_id) REFERENCES student_profile(id) ON DELETE CASCADE;

-- Drop old user_id columns and constraints
ALTER TABLE personal_details DROP COLUMN user_id;
ALTER TABLE education DROP COLUMN user_id;
ALTER TABLE family DROP COLUMN user_id;
ALTER TABLE academic_details DROP COLUMN user_id;
ALTER TABLE verification_logs DROP COLUMN user_id;
```

---

### STEP 8: Update Existing Services (PersonalDetailService, EducationService, etc.)
**Pattern for all services**:

In each service file, update methods to use `studentId` instead of `userId`:

Example for PersonalDetailService:
```typescript
// OLD: async create(userId: string, createDto)
// NEW: async create(studentId: string, createDto)

async create(studentId: string, createDto: CreatePersonalDetailDto): Promise<PersonalDetails> {
  const personalDetail = this.personalDetailRepository.create({
    studentId,  // Changed from userId
    ...createDto,
  });
  return await this.personalDetailRepository.save(personalDetail);
}
```

Apply this pattern to:
- PersonalDetailService
- EducationService
- FamilyService
- AcademicDetailService
- DocumentUploadService
- ReviewService

---

### STEP 9: Update Existing Controllers
**Pattern for all controllers**:

Controllers should accept `registrationNumber` or `studentId` instead of (or in addition to) `userId`

Example for PersonalDetailController:
```typescript
@Post()
async create(@Req() req, @Body() createDto) {
  // Get studentId from authenticated user
  const user = req.user;  // Decoded JWT
  
  // Find StudentProfile by userId
  const studentProfile = await this.studentProfileService.getByUserId(user.id);
  
  if (!studentProfile) {
    throw new NotFoundException('Student profile not found');
  }
  
  return await this.personalDetailService.create(studentProfile.id, createDto);
}
```

---

## FINAL ARCHITECTURE DIAGRAM

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request (Client)                    │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
        ┌────────────────────────────────────────┐
        │      StudentProfileController          │
        │  (handles /student-profile/* routes)   │
        └────────────────┬───────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────────────┐
        │    StudentProfileService               │
        │  (aggregates all student data)         │
        └────────────────┬───────────────────────┘
                         │
        ┌────────────────┼────────────────────┐
        │                │                    │
        ▼                ▼                    ▼
   ┌─────────┐   ┌──────────────┐   ┌────────────────┐
   │StudentP-│   │Existing      │   │Database        │
   │rofile   │──►│Services      │──►│Tables          │
   │Service  │   │(Personal,    │   │(PostgreSQL)    │
   └─────────┘   │ Education,   │   │                │
                 │ Family, etc) │   │ ┌────────────┐ │
                 └──────────────┘   │ │StudentPro- │ │
                                    │ │file        │ │
                                    │ ├────────────┤ │
                                    │ │PersonalDet │ │
                                    │ ├────────────┤ │
                                    │ │Education   │ │
                                    │ ├────────────┤ │
                                    │ │Family      │ │
                                    │ ├────────────┤ │
                                    │ │AcademicDet │ │
                                    │ ├────────────┤ │
                                    │ │VerifLog    │ │
                                    │ └────────────┘ │
                                    └────────────────┘
```

---

## SUCCESS CRITERIA

After implementation, you should be able to:

✅ **Query complete student profile in one call**:
```typescript
const studentProfile = await studentProfileService.getCompleteStudentProfile('REG-20240001');
// Returns: { id, registrationNumber, personalDetails, educationHistory, familyMembers, academicDetails, verificationLogs }
```

✅ **Admin dashboard can display all student data**:
```typescript
const allStudents = await studentProfileService.getAllStudents({ page: 1, limit: 10 });
// Returns paginated list of all students with summary info
```

✅ **Cascade delete works properly**:
- Deleting StudentProfile removes all related records
- No orphaned data

✅ **Data integrity enforced**:
- Foreign keys prevent invalid references
- Unique registrationNumber
- One StudentProfile per User

✅ **Admin features enabled**:
- Track enrollment status (enrolled, graduated, suspended)
- View all student documents and verification logs
- Generate student reports easily

---

## IMPORTANT NOTES

1. **Backward Compatibility**: Update all controllers and services that currently use `userId` to work with StudentProfile
2. **Data Migration**: Plan data migration carefully to avoid data loss
3. **Testing**: Create unit tests for new StudentProfileService methods
4. **Error Handling**: Include proper error messages for missing relationships
5. **API Documentation**: Document new endpoints with OpenAPI/Swagger

---

## IMPLEMENTATION ORDER (RECOMMENDED)

1. Create StudentProfile entity
2. Create StudentProfile service & controller
3. Update ApplicationModule
4. Update existing entities (add relations)
5. Update existing services (change userId → studentId)
6. Update existing controllers
7. Create and run database migration
8. Test all endpoints
9. Create unit tests

---

## QUESTIONS TO CLARIFY DURING IMPLEMENTATION

- Should registrationNumber be auto-generated or user-provided?
- Should we keep historical enrollment status changes (audit)?
- Do we need soft deletes for StudentProfile?
- Should we add role-based access control to viewing/modifying StudentProfile?

---

## FINAL DELIVERABLES

✓ StudentProfile entity with all relationships
✓ StudentProfileService with 7+ core methods
✓ StudentProfileController with 6+ endpoints
✓ Updated StudentProfileModule
✓ Updated existing entities with relationships
✓ Updated existing services (5 services)
✓ Updated existing controllers (6 controllers)
✓ Database migration script
✓ Unit tests for StudentProfileService
✓ API documentation for new endpoints
