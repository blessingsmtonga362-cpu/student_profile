export class CreateUserDto {
    firstName !: string;
    lastName !: string;
    email !: string;
    password !: string;
    university !: string;
    registrationNumber?: string; // Optional, but required if role is Student
    role !: string; // Should be 'Admin' or 'Student'
}
