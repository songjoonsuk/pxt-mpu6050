
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
const MPU6050_RA_USER_CTRL              =   0x6A
const MPU6050_USERCTRL_FIFO_RESET_BIT   =   2



/* #region Enums for Modes, etc */

// Parameters for setting the internal integration time of the RGBC clear and IR channel.
enum MPU6050_ATIME {
    TIME_2_4_MS = 0xFF,    // 1 2.4 ms 1024
    TIME_24_MS = 0xF6,     // 10 24 ms 10240
    TIME_100_MS = 0xD5,    // 42 101 ms 43008
    TIME_154_MS = 0xC0,    // 64 154 ms 65535
    TIME_700_MS = 0x00     // 256 700 ms 65535
}

// Parameters for setting the wait time register.
enum MPU6050_WTIME {
    WTIME_2_4_MS = 0xFF,    // 1 2.4 ms 0.029 sec
    WTIME_204_MS = 0xAB,    // 85 204 ms 2.45 sec
    WTIME_614_MS = 0x00     // 256 614 ms 7.4 sec
}

// Parameters for...
enum RGB {
    RED,
    GREEN,
    BLUE,
    CLEAR
}

// Parameters for setting the persistence register. The persistence register controls the filtering interrupt capabilities of the device.
enum MPU6050_APERS {
    APERS_0_CLEAR = 0b0000,      // Every RGBC cycle generates an interrupt
    APERS_1_CLEAR = 0b0001,      // 1 clear channel value outside of threshold range
    APERS_2_CLEAR = 0b0010,      // 2 clear channel consecutive values out of range
    APERS_3_CLEAR = 0b0011,      // 3 clear channel consecutive values out of range
    APERS_5_CLEAR = 0b0100,      // 5 clear channel consecutive values out of range
    APERS_10_CLEAR = 0b0101,     // 10 clear channel consecutive values out of range
    APERS_15_CLEAR = 0b0110,     // 15 clear channel consecutive values out of range
    APERS_20_CLEAR = 0b0111,     // 20 clear channel consecutive values out of range
    APERS_25_CLEAR = 0b1000,     // 25 clear channel consecutive values out of range
    APERS_30_CLEAR = 0b1001,     // 30 clear channel consecutive values out of range
    APERS_35_CLEAR = 0b1010,     // 35 clear channel consecutive values out of range
    APERS_40_CLEAR = 0b1011,     // 40 clear channel consecutive values out of range
    APERS_45_CLEAR = 0b1100,     // 45 clear channel consecutive values out of range
    APERS_50_CLEAR = 0b1101,     // 50 clear channel consecutive values out of range
    APERS_55_CLEAR = 0b1110,     // 55 clear channel consecutive values out of range
    APERS_60_CLEAR = 0b1111,     // 60 clear channel consecutive values out of range
}

// Parameters for setting the gain of the sensor.
enum MPU6050_AGAIN {
    GAIN_1X = 0x0,      // 1x gain
    GAIN_4X = 0x1,      // 4x gain
    GAIN_16X = 0x2,      // 16x gain
    GAIN_60X = 0x3       // 60x gain
}

/* #endregion */

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

    /**
     * Read a (UInt16) 16-byte register of the address location
     */
    export function readRegisterUInt16(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.UInt16LE);
    }

    /**
     * Read a (Int16) 16-byte register of the address location
     */
    export function readRegisterInt16(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(addr, NumberFormat.Int16LE);
    }

}

//% weight=100 color=#0fbc11 icon=""
namespace MPU6050 {


    function SetClockSource() {

        let temp = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_PWR_MGMT_1);
        temp = temp & 0xFC;
        temp = temp | 0x01;    // MPU6050_CLOCK_PLL_XGYRO

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





    
    export let isConnected = false;
    

    //% blockId="getDeviceID" block="Read Gyro Devide ID"
    export function getDeviceID() : number {
        
        let device_id = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_WHO_AM_I); 
        return device_id;
    }
    
    //% blockId="Initialize" block="Initailize Gyro Sensor"
    export function initialize() {
        SetClockSource();
        SetFullScaleGyroRange();
        SetFullScaleAccelRange();
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








    /*
    export function calibrate_Sensors(   ??????  offSets:number[]      ) : boolean {





        return 
    }  
  
    export type XYZ = {
        ax: number,
        ay: number,
        az: number,
        gx: number,
        gy: number,
        gz: number
    };

    export function getMotion6() : XYZ {


        return {
            ax:  
            ay: 
            az: 
            gx:
            gy:
            gz:
        }


    }   

*/




}


