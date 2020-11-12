
// MPU6050 extension

const MPU6050_ADDRESS_AD0_LOW           =   0x68 // address pin low (GND), default for InvenSense evaluation board
const MPU6050_ADDRESS_AD0_HIGH          =   0x69 // address pin high (VCC)
const MPU6050_DEFAULT_ADDRESS           =   MPU6050_ADDRESS_AD0_LOW

const MPU6050_CLOCK_PLL_XGYRO           =   0x01
const MPU6050_GYRO_FS_250               =   0x00
const MPU6050_ACCEL_FS_2                =   0x00
const MPU6050_RA_PWR_MGMT_1             =   0x6B
const MPU6050_PWR1_CLKSEL_BIT           =   2
const MPU6050_PWR1_CLKSEL_LENGTH        =   3
const MPU6050_RA_GYRO_CONFIG            =   0x1B
const MPU6050_GCONFIG_FS_SEL_BIT        =   4
const MPU6050_GCONFIG_FS_SEL_LENGTH     =   2
const MPU6050_RA_ACCEL_CONFIG           =   0x1C
const MPU6050_ACONFIG_AFS_SEL_BIT       =   4
const MPU6050_ACONFIG_AFS_SEL_LENGTH    =   2
const MPU6050_PWR1_SLEEP_BIT            =   6
const MPU6050_RA_WHO_AM_I               =   0x75
const MPU6050_WHO_AM_I_BIT              =   7
const MPU6050_WHO_AM_I_LENGTH           =   8
const MPU6050_TC_OFFSET_BIT             =   6
const MPU6050_TC_OFFSET_LENGTH          =   6

const MPU6050_RA_XG_OFFS_TC             =   0x00 //[7] PWR_MODE, [6:1] XG_OFFS_TC, [0] OTP_BNK_VLD
const MPU6050_RA_YG_OFFS_TC             =   0x01 //[7] PWR_MODE, [6:1] YG_OFFS_TC, [0] OTP_BNK_VLD
const MPU6050_RA_ZG_OFFS_TC             =   0x02 //[7] PWR_MODE, [6:1] ZG_OFFS_TC, [0] OTP_BNK_VLD

const MPU6050_RA_XA_OFFS_H              =   0x06 //[15:0] XA_OFFS
const MPU6050_RA_YA_OFFS_H              =   0x08 //[15:0] YA_OFFS
const MPU6050_RA_ZA_OFFS_H              =   0x0A //[15:0] ZA_OFFS

const MPU6050_RA_ACCEL_XOUT_H           =   0x3B
const MPU6050_RA_TEMP_OUT_H             =   0x41
const MPU6050_RA_GYRO_XOUT_H            =   0x43
const MPU6050_RA_USER_CTRL              =   0x6A
const MPU6050_USERCTRL_FIFO_RESET_BIT   =   2



let acc_buf = pins.createBuffer(6);
let gyr_buf = pins.createBuffer(6);
let tem_buf = pins.createBuffer(2);


let gbuf = pins.createBuffer(14);
let ax: number;
let ay: number;
let az: number;
let gx: number;
let gy: number;
let gz: number;
let temperature: number;


//Functions for helping with reading and writing registers of different sizes
namespace RegisterHelper {

    /**
     * Write register of the address location
     */
    export function writeRegister(addr: number, reg: number, dat: number): void {
        let _registerBuffer = pins.createBuffer(2);
        _registerBuffer[0] = reg;
        _registerBuffer[1] = dat;
        pins.i2cWriteBuffer(addr, _registerBuffer);
    }

    /**
     * Read a 8-byte register of the address location
     */
    export function readRegister8(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    }

    export function readRegister8N(addr: number,reg:number, rep: number) {

        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE, true);
        for (let i = 0; i < (rep-1); i++) {
            gbuf[i] =  pins.i2cReadNumber(addr, NumberFormat.UInt8BE, true);      
        
        }
        gbuf[rep-1] = pins.i2cReadNumber(addr, NumberFormat.UInt8BE, false);
    }

    /**
     * Read a (UInt16) 16-byte register of the address location
     */
    export function readRegisterUInt16(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt16BE);
    }

    /**
     * Read a (Int16) 16-byte register of the address location
     */
    export function readRegisterInt16(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.Int16BE);
    }

}

//% weight=100 color=#0fbc11 icon=""
namespace MPU6050 {


    function SetClockSource() {

        let temp = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_PWR_MGMT_1);
        temp = temp & 0xF8;
        temp = temp | 0x00;    // MPU6050_CLOCK_PLL_XGYRO

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_PWR_MGMT_1, temp); 
    }

    function SetFullScaleGyroRange() {
        let temp = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_GYRO_CONFIG);
        temp = temp & 0xE7;
        temp = temp | 0x00;    // MPU6050_GYRO_FS_250

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_CONFIG, temp); 
    }

    function SetFullScaleAccelRange() {
        let temp = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_ACCEL_CONFIG);
        temp = temp & 0xE7;
        temp = temp | 0x00;    // MPU6050_ACCEL_FS_2

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_CONFIG, temp); 
    }

    function SetSleepDisable() {
        let temp = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_PWR_MGMT_1);
        temp = temp & 0xBF;
        temp = temp | 0x00;    // MPU6050_PWR1_SLEEP_BIT

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_PWR_MGMT_1, temp); 
    }




    //% blockId="getDeviceID" block="Read Gyro Device ID"
    export function getDeviceID() : number {
        
        let device_id = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_WHO_AM_I); 
        return device_id;
    }
    
    //% blockId="Initialize" block="Initailize Gyro Sensor 2"
    export function initialize() {
        SetClockSource();
        SetFullScaleGyroRange();
        SetFullScaleAccelRange();
        SetSleepDisable();
    }

    //% blockId="ReadClockSource" block="Read Clock Source"
    export function ReadClockSource() : number {
        return RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_PWR_MGMT_1);

    }
    //% blockId="ReadGyroRange" block="Read Gyro Range"
    export function ReadGyroRange() : number {
        return RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_CONFIG);

    }
    //% blockId="ReadAccRange" block="Read Acceleration Range"
    export function ReadAccRange() : number {
        return RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_CONFIG);

    }

 

    //% blockId="getMotion" block="Read Motion Data 7"
    export function getMotion6() {

        // RegisterHelper.readRegister8N(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_XOUT_H, 14);
        temperature = RegisterHelper.readRegisterUInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_TEMP_OUT_H);

    //    temperature = (gbuf[0] << 8) | gbuf[1] ;
    

    /*
        ax = (gbuf[0] << 8) | gbuf[1] ;
        ay = (gbuf[2] << 8) | gbuf[3] ;
        az = (gbuf[4] << 8) | gbuf[5] ;

        temperature = (gbuf[6] << 8) | gbuf[7] ;

        gx = ( gbuf[8] << 8) | gbuf[9] ;
        gy = (gbuf[10] << 8) | gbuf[11] ;
        gz = (gbuf[12] << 8) | gbuf[13] ;
    */




    }   

    //% blockId="ReadAX" block="Read AX"
    export function readAX() : number {
        return ax;
    }
    //% blockId="ReadAY" block="Read AY"
    export function readAY() : number {
        return ay;
    }
    //% blockId="ReadAZ" block="Read AZ"
    export function readAZ() : number {
        return az;
    }
    //% blockId="ReadGX" block="Read GX"
    export function readGX() : number {
        return gx;
    }
    //% blockId="ReadGY" block="Read GY"
    export function readGY() : number {
        return gy;
    }
    //% blockId="ReadGZ" block="Read GZ"
    export function readGZ() : number {
        return gz;
    }
    //% blockId="ReadTemperature" block="Read Temperature"
    export function readTemperature() : number {
        return temperature;
    }











/*
    export function calibrate_Sensors(   ??????  offSets:number[]      ) : boolean {


        return 
    }  



*/




}


