# Cobra Voice Activity Detection Engine Demo for STM32F411 (Multiple languages)

This package contains a demo project for the STM32F411 Discovery kit using Cobra voice activity
detection engine. Cobra VAD for MCU is currently in Beta and available for evaluation for 30 minutes
per device, (i.e., user). If you are working on a commercial project or require extended access,
please contact [Picovoice](http://picovoice.ai/contact) with your project details.

## Installation

For this demo, you need to:
<!-- markdown-link-check-disable -->
1. Download and install [STM32CubeIDE](https://www.st.com/en/development-tools/stm32cubeide.html), which is an
   all-in-one multi-OS development tool for STM32 microcontrollers.
2. Download [STM32Cube MCU Package for STM32F4 series](https://www.st.com/en/embedded-software/stm32cubef4.html) and
   extract it somewhere on your computer.
<!-- markdown-link-check-enable -->
## AccessKey

Cobra requires a valid Picovoice `AccessKey` at initialization. `AccessKey` acts as your credentials when using
Cobra SDKs.
You can get your `AccessKey` for free. Make sure to keep your `AccessKey` secret.
Signup or Login to [Picovoice Console](https://console.picovoice.ai/) to get your `AccessKey`.

## Usage

To compile and run the demo project on a STM32f411 discovery board, perform the following steps:

1. Open STM32CubeIDE
2. Click `File` > `Open Projects from file system...` to display the `Import Projects` dialog box. Select
   the [stm32f469i-disco](./stm32f411e-disco) folder from this repository, and then press the `Finish` button.
3. Go to the folder where you extracted `STM32Cube MCU Package for STM32F4 series`, and then copy the contents of
   the `/Middlewares/ST/STM32_Audio/Addons/PDM` folder
   to [/Middlewares/ST/STM32_Audio/Addons/PDM](./stm32f411e-disco/Middlewares/ST/STM32_Audio/Addons/PDM).
4. Select the `stm32f411e-disco-demo` project inside the `Project Explorer` window
5. Replace `ACCESS_KEY` in both `main.c` with your AccessKey obtained
   from [Picovoice Console](https://console.picovoice.ai/)
6. Click `Project` > `Build Project`
7. Connect the board to the computer and press `Run` > `Run`, the LED lights up when Cobra detects voice activity
<!-- markdown-link-check-disable -->
> :warning: `printf()` uses the SWO connector and the trace port 0. For more information, refer
>
> to [STM32 microcontroller debug toolbox](https://www.st.com/resource/en/application_note/dm00354244-stm32-microcontroller-debug-toolbox-stmicroelectronics.pdf)
> , Chapter 7.

