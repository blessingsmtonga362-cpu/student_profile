import { Role } from '../../auth/role.enum';
import { Column,Entity,PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn('uuid') 
    id !:string;

    @Column()
    firstName !: string;
    @Column({ unique: true })  // Database level: allows NULL
    registrationNumber !: string;

    //i added this field to the user entity to be able to search for users by their registration number instead of email, which is more convenient for our use case. 
    @Column()
    lastName !: string;

    @Column({ unique: true })
    email !: string;

    @Column()
    password !: string;

    @Column()
    university !: string;

    // Correct
@Column({ 
    type: 'enum', 
    enum: Role, 
    default: Role.User 
})
    role !: Role;
}
