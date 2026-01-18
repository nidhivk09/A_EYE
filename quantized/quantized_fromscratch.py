import tensorflow as tf
import larq as lq
import numpy as np
import matplotlib.pyplot as plt

kwargs = dict(input_quantizer="ste_sign",
              kernel_quantizer="ste_sign",
              kernel_constraint="weight_clip",
              use_bias=False)

model = tf.keras.models.Sequential([
    # In the first layer we only quantize the weights and not the input
    lq.layers.QuantConv2D(64, 3,
                          kernel_quantizer="ste_sign",
                          kernel_constraint="weight_clip",
                          use_bias=False,
                          input_shape=(48, 48, 3)),
    tf.keras.layers.MaxPool2D(pool_size=(2, 2), strides=(2, 2)),
    tf.keras.layers.BatchNormalization(momentum=0.999, scale=False),

    lq.layers.QuantConv2D(64, 3, padding="same", **kwargs),
    tf.keras.layers.MaxPool2D(pool_size=(2, 2), strides=(2, 2)),
    tf.keras.layers.BatchNormalization(momentum=0.999, scale=False),

    #lq.layers.QuantConv2D(256, 3, padding="same", **kwargs),
    #tf.keras.layers.MaxPool2D(pool_size=(2, 2), strides=(2, 2)),
    #tf.keras.layers.BatchNormalization(momentum=0.999, scale=False),
    tf.keras.layers.Flatten(),

    lq.layers.QuantDense(128, **kwargs),
    tf.keras.layers.BatchNormalization(momentum=0.999, scale=False),

    lq.layers.QuantDense(2, **kwargs),
    tf.keras.layers.BatchNormalization(momentum=0.999, scale=False),
    tf.keras.layers.Activation("softmax")
])

lq.models.summary(model)

IMAGE_SIZE = (48, 48)
BATCH_SIZE = 32
DATA_DIR = "/home/giri/Downloads/dataset" # Replace with your directory path
VALIDATION_SPLIT = 0.2

data_dir =DATA_DIR
def prep_fn(img):
    img = img.astype(np.float32) / 255.0
    img = (img - 0.5) * 2
    return img


    
# 2. Create an ImageDataGenerator instance and specify data augmentation/preprocessing options
# Rescaling pixel values from [0, 255] to [0, 1] is common
datagen = tf.keras.preprocessing.image.ImageDataGenerator(
    preprocessing_function=prep_fn,
    validation_split=0.2 # Example of using a validation split
)

# 3. Use flow_from_directory to create a generator for training data
train_generator = datagen.flow_from_directory(
    directory=data_dir,
    target_size=IMAGE_SIZE, # All images will be resized to 150x150
    batch_size=BATCH_SIZE,
    class_mode='categorical', # "binary" for 2 classes, "categorical" for more
    subset='training' # Specify subset for training
)

# 4. Use flow_from_directory to create a generator for validation data
validation_generator = datagen.flow_from_directory(
    directory=data_dir,
    target_size=IMAGE_SIZE,
    batch_size=BATCH_SIZE,
    class_mode='categorical',
    subset='validation' # Specify subset for validation
)

model.compile(
    tf.keras.optimizers.Adam(lr=0.01, decay=0.0001),
    #tf.keras.optimizers.SGD(learning_rate=0.01, momentum=0.9, nesterov=True),
    loss="categorical_crossentropy",
    metrics=["accuracy"],
)

trained_model = model.fit(train_generator,
    batch_size=BATCH_SIZE, 
    epochs=100,
    validation_data=validation_generator,
    shuffle=True
)

plt.plot(trained_model.history['acc'])
plt.plot(trained_model.history['val_acc'])
plt.title('model accuracy')
plt.ylabel('accuracy')
plt.xlabel('epoch')
plt.legend(['train', 'test'], loc='upper left')
plt.savefig("acc.png")

print(np.max(trained_model.history['acc']))
print(np.max(trained_model.history['val_acc']))





