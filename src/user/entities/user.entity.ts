import { Role } from "src/auth/role.enum";
import { Column,Entity,PrimaryGeneratedColumn } from "typeorm";

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id !:number;

    @Column()
    firstName !: string;
    @Column({ nullable: true })  // Database level: allows NULL
    registrationNumber: string;

    //i added this field to the user entity to be able to search for users by their registration number instead of email, which is more convenient for our use case. 
    @Column()
    lastName !: string;

    @Column({ unique: true })
    email !: string;

    @Column()
    password !: string;

    @Column()
    university !: string;

    @Column({ type: 'enum',enum:Role,default: Role.User })
    role !: Role;

}
