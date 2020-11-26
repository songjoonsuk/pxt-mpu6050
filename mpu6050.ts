
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

const MPU6050_RA_ACCEL_XOUT_H           =   0x3B
const MPU6050_RA_TEMP_OUT_H             =   0x41
const MPU6050_RA_GYRO_XOUT_H            =   0x43
const MPU6050_RA_USER_CTRL              =   0x6A
const MPU6050_USERCTRL_FIFO_RESET_BIT   =   2

const MPU6050_RA_XA_OFFS_H              =   0x06 //[15:0] XA_OFFS
const MPU6050_RA_YA_OFFS_H              =   0x08 //[15:0] YA_OFFS
const MPU6050_RA_ZA_OFFS_H              =   0x0A //[15:0] ZA_OFFS

const MPU6050_XG_OFFSET_H           = 0x13;
const MPU6050_YG_OFFSET_H           = 0x15;
const MPU6050_ZG_OFFSET_H           = 0x17;


const ACC_ERR_LIMIT     = 10;
const GYRO_ERR_LIMIT    = 2;



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

let gyro_x_bias: number;
let gyro_y_bias: number;
let gyro_z_bias: number;

let var_x: number;
let var_y: number;
let var_z: number;

let avg_ax: number;
let avg_ay: number;
let avg_az: number;

let ax_offset: number;
let ay_offset: number;
let az_offset: number;




//Functions for helping with reading and writing registers of different sizes
namespace RegisterHelper {

    export function mpu_write(reg: number, data: number) {
        pins.i2cWriteNumber(MPU6050_DEFAULT_ADDRESS, reg << 8 | (data & 0xff), NumberFormat.UInt16BE);
    //    pins.i2cWriteNumber(MPU6050_DEFAULT_ADDRESS, (reg && 0xff) | (data << 8), NumberFormat.UInt16BE);
    }

    export function mpu_write_int16(reg: number, data: number) {
        mpu_write(reg, (data >> 8) & 0xff);
        mpu_write(reg + 1, data & 0xff);
    }



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
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
    }

    export function readRegister8N(addr: number,reg:number, rep: number) {

        let num = rep-2;

        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE, true);
        for (let i = 0; i < num; i++) {
            gbuf[i] =  pins.i2cReadNumber(addr, NumberFormat.UInt8BE, true);      
        
        }
        gbuf[num+1] = pins.i2cReadNumber(addr, NumberFormat.UInt8BE, false);
    }

    /**
     * Read a (UInt16) 16-byte register of the address location
     */
    export function readRegisterUInt16(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE,true);
        return pins.i2cReadNumber(addr, NumberFormat.UInt16BE,false);
    }

    /**
     * Read a (Int16) 16-byte register of the address location
     */
    export function readRegisterInt16(addr: number, reg: number): number {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE, true);
        return pins.i2cReadNumber(addr, NumberFormat.Int16BE, false);
    }

}

//% weight=100 color=#0fbc11 icon=""
namespace MPU6050 {

    function DeviceReset() {

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_PWR_MGMT_1, 0x80 ); 
    }


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

    //% block
    //% weight=100
    export function getXAoffsH() : number {
        
        let device_id = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_XA_OFFS_H); 
        return device_id;
    }
      
    //% block
    //% weight=99
    export function getXAoffsL() : number {
        
        let device_id = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_XA_OFFS_H+1); 
        return device_id;
    }

    //% block
    //% weight=98
    export function GetXAOffset() : number {

        let XA_ofs = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_XA_OFFS_H);

        return XA_ofs;
    }

     
    //% blockId="getDeviceID" block="Read Gyro Device ID"
    export function getDeviceID() : number {
        
        let device_id = RegisterHelper.readRegister8(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_WHO_AM_I); 
        return device_id;
    }
    
    //% blockId="Initialize" block="Initailize Gyro Sensor 2"
    export function initialize() {

        DeviceReset()
        basic.pause(100);

        SetClockSource();
        SetFullScaleGyroRange();
        SetFullScaleAccelRange();
        SetSleepDisable();

        
        calib();
               

     

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

    /**
    * Converts a number to signed 16-bit integer.
    */
    function int16( v: number ): number {
        return (v << 16) >> 16;
    }

    /**
    * Converts a number to unsigned 16-bit integer.
    */
    function uint16( v: number ): number {
        return v & 0xFFFF;
    }

    //% blockId="getMotion" block="Read Motion Data 47"
    export function getMotion6() {

 

        ax = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_XOUT_H)
        ay = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_XOUT_H+2)
        az = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_XOUT_H+4)

        temperature = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_TEMP_OUT_H);
        temperature /= 340.00;
        temperature += 36.53;



        gx = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_XOUT_H)
        gy = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_XOUT_H+2)
        gz = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_XOUT_H+4)



    

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


    export function get_avg() {

        const count = 1000;
        let x_sum : number;

        x_sum = 0;

        

        for(let i=0;i< count;i++) {

            getMotion6();
            x_sum += ax;

            basic.pause(2);

        }
        avg_ax = x_sum / count;

    }

    export function calib(): any {


        get_avg();

        ax_offset = avg_ax / 8;

        while(1) {
            RegisterHelper.mpu_write_int16(MPU6050_RA_XA_OFFS_H,ax_offset);
            get_avg();

            if( Math.abs(avg_ax) < ACC_ERR_LIMIT ) return avg_ax;
            else {
                let tmp = avg_ax / ACC_ERR_LIMIT;
                ax_offset -= tmp;
            }

        }
        
    }



    //% block
    //% weight=95
    export function AX_calib(): number {

        const count = 1000;
        let x_sum : number;

        x_sum = 0;

        for(let i=0;i< count;i++) {
            x_sum += RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_ACCEL_XOUT_H);

        }
        let avg_x = x_sum / count;
        
        let mean_x = avg_x;

        let reg = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS, MPU6050_RA_XA_OFFS_H);
        avg_x /= 8;
        reg -= avg_x;

    
        RegisterHelper.mpu_write_int16(MPU6050_RA_XA_OFFS_H,reg);

        return mean_x;

    }

   


    /**
     * Compute the gyro bias for all three axis. The bias for each axis is the average of 100 samples.
     * Returns true if the sensor is steady enough to calculate the bias.
     * The bias values are store in gyro_x_bias, gyro_y_bias and gyro_z_bias.
     */
    //% block
    //% weight=90
    export function compute_gyro_bias(): boolean {



        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS, MPU6050_XG_OFFSET_H,      0);
        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS, MPU6050_XG_OFFSET_H + 1,  0);

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS, MPU6050_YG_OFFSET_H,      0);
        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS, MPU6050_YG_OFFSET_H + 1,  0);

        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS, MPU6050_ZG_OFFSET_H,      0);
        RegisterHelper.writeRegister(MPU6050_DEFAULT_ADDRESS, MPU6050_ZG_OFFSET_H + 1,  0);

        
        const N = 100;
        const MAX_VAR = 40;
        let sum_x = 0, sum_y = 0, sum_z = 0;
        let xs: number[] = [], ys: number[] = [], zs: number[] = [];
        for (let i = 0; i < N; i++) {

            let x = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_XOUT_H)
            let y = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_XOUT_H+2)
            let z = RegisterHelper.readRegisterInt16(MPU6050_DEFAULT_ADDRESS,MPU6050_RA_GYRO_XOUT_H+4)

            
            sum_x += x;
            sum_y += y;
            sum_z += z;
            xs.push(x);
            ys.push(y);
            zs.push(z);
            basic.pause(1);
        }
        let mean_x = sum_x / N;
        let mean_y = sum_y / N;
        let mean_z = sum_z / N;
        var_x = 0;
        var_y = 0;
        var_z = 0;
        for (let i = 0; i < N; i++) {
            let dx = xs[i] - mean_x;
            var_x = var_x + dx * dx;
            let dy = ys[i] - mean_y;
            var_y = var_y + dy * dy;
            let dz = zs[i] - mean_z;
            var_z = var_z + dz * dz;
        }
        var_x = var_x / N;
        var_y = var_y / N;
        var_z = var_z / N;
        if (var_x > MAX_VAR || var_y > MAX_VAR || var_z > MAX_VAR) {
            return false;
        }
        gyro_x_bias = mean_x;
        gyro_y_bias = mean_y;
        gyro_z_bias = mean_z;
        return true;
    }



    /**
     * Set the gyro bias. The bias can be calculated by calling get_gyro_bias().
     * @param x_bias Bias in the X direction, eg: 0
     * @param y_bias Bias in the Y direction, eg: 0
     * @param z_bias Bias in the Z direction, eg: 0
     */
    //% block
    //% weight=96
    export function set_gyro_bias(x_bias: number, y_bias: number, z_bias: number) {

        RegisterHelper.mpu_write_int16(MPU6050_XG_OFFSET_H, -2 * x_bias);
        RegisterHelper.mpu_write_int16(MPU6050_YG_OFFSET_H, -2 * y_bias);
        RegisterHelper.mpu_write_int16(MPU6050_ZG_OFFSET_H, -2 * z_bias);
    }









/*
    export function calibrate_Sensors(   ??????  offSets:number[]      ) : boolean {


        return 
    }  



*/




}


